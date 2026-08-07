import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import {
  extractionBlocksPublication,
  isPublicationInFlight,
  publicationActionForTarget,
} from "./model/releaseState";
import {
  isOrganizationMember,
  requireOrganizationPermission,
} from "./permissions";
import { assertDraftReadable } from "./model/draft";

async function requireSiteForMember(
  ctx: Parameters<typeof isOrganizationMember>[0],
  siteId: Id<"sites">,
) {
  const site = await ctx.db.get(siteId);
  if (!site || !(await isOrganizationMember(ctx, site.organizationId))) {
    return null;
  }
  return site;
}

const nonterminalPublicationStatuses = [
  "building",
  "clearing",
  "aborting",
] as const;

export const getDraftSummary = query({
  args: { siteId: v.id("sites") },
  returns: v.any(),
  handler: async (ctx, { siteId }) => {
    const site = await requireSiteForMember(ctx, siteId);
    if (!site) return null;
    const liveRelease = site.liveReleaseId
      ? await ctx.db.get(site.liveReleaseId)
      : null;
    return {
      draftRevision: site.draftRevision ?? 0,
      liveRelease,
      nextReleaseNumber: site.nextReleaseNumber ?? 1,
      hasUnpublishedChanges:
        Boolean(site.activeDraftRestoreId) ||
        (await ctx.db
          .query("draftChanges")
          .withIndex("by_site", (q) => q.eq("siteId", siteId))
          .first()) !== null ||
        site.draftBaseReleaseId !== site.liveReleaseId,
    };
  },
});

export const getDraftChanges = query({
  args: { siteId: v.id("sites") },
  returns: v.any(),
  handler: async (ctx, { siteId }) => {
    const site = await requireSiteForMember(ctx, siteId);
    if (!site) return null;
    assertDraftReadable(site);
    const changes = await ctx.db
      .query("draftChanges")
      .withIndex("by_site", (q) => q.eq("siteId", siteId))
      .collect();
    if (
      changes.length === 0 &&
      site.draftBaseReleaseId !== site.liveReleaseId
    ) {
      return [
        {
          entityType: "site",
          entityId: siteId,
          changeType: "updated",
          label: "Published version",
          details: ["Draft and live version differ"],
        },
      ];
    }
    return changes;
  },
});

export const getPublicationStatus = query({
  args: { releaseId: v.id("siteReleases") },
  returns: v.union(
    v.null(),
    v.object({
      status: v.union(
        v.literal("building"),
        v.literal("aborting"),
        v.literal("clearing"),
        v.literal("complete"),
        v.literal("failed"),
      ),
      failure: v.optional(v.string()),
    }),
  ),
  handler: async (ctx, { releaseId }) => {
    const release = await ctx.db.get(releaseId);
    if (!release || !(await requireSiteForMember(ctx, release.siteId))) {
      return null;
    }
    return {
      status: release.publicationStatus ?? "complete",
      failure: release.publicationFailure,
    };
  },
});

export const list = query({
  args: { siteId: v.id("sites") },
  returns: v.any(),
  handler: async (ctx, { siteId }) => {
    const site = await requireSiteForMember(ctx, siteId);
    if (!site) return [];
    const releases = await ctx.db
      .query("siteReleases")
      .withIndex("by_site", (q) => q.eq("siteId", siteId))
      .order("desc")
      .collect();
    return releases
      .filter(
        (release) =>
          release.publicationStatus === undefined ||
          release.publicationStatus === "complete",
      )
      .map((release) => ({
        ...release,
        isLive: release._id === site.liveReleaseId,
      }));
  },
});

export const get = query({
  args: { releaseId: v.id("siteReleases") },
  returns: v.any(),
  handler: async (ctx, { releaseId }) => {
    const release = await ctx.db.get(releaseId);
    if (
      !release ||
      (release.publicationStatus !== undefined &&
        release.publicationStatus !== "complete")
    ) {
      return null;
    }
    const site = await requireSiteForMember(ctx, release.siteId);
    if (!site) return null;
    const changes = await ctx.db
      .query("releaseChanges")
      .withIndex("by_release", (q) => q.eq("releaseId", releaseId))
      .collect();
    return {
      release: { ...release, isLive: site.liveReleaseId === releaseId },
      changes: changes.map((change) => ({
        entityType: change.entityType,
        entityId: change.entityId,
        changeType: change.changeType,
        label: change.label,
        fields: change.fields,
        content: change.content,
      })),
    };
  },
});

export const publish = mutation({
  args: {
    siteId: v.id("sites"),
    expectedDraftRevision: v.number(),
  },
  returns: v.object({
    releaseId: v.id("siteReleases"),
    number: v.number(),
    reused: v.boolean(),
  }),
  handler: async (ctx, { siteId, expectedDraftRevision }) => {
    const site = await ctx.db.get(siteId);
    if (!site) throw new ConvexError("Site not found");
    const { auth } = await requireOrganizationPermission(
      ctx,
      site.organizationId,
      { resource: "publication", action: "publish" },
    );
    const draftRevision = site.draftRevision ?? 0;
    if (site.activeDraftRestoreId) {
      throw new ConvexError(
        "A historical version is currently being restored. Try publishing when it finishes.",
      );
    }
    if (draftRevision !== expectedDraftRevision) {
      throw new ConvexError(
        "The draft changed while publishing. Review the latest changes and try again.",
      );
    }

    const activePublications = await Promise.all(
      nonterminalPublicationStatuses.map((status) =>
        ctx.db
          .query("siteReleases")
          .withIndex("by_site_publication_status", (q) =>
            q.eq("siteId", siteId).eq("publicationStatus", status),
          )
          .first(),
      ),
    );
    const activePublication = activePublications.find(Boolean);
    if (
      activePublication &&
      isPublicationInFlight(activePublication.publicationStatus)
    ) {
      if (
        activePublication.publicationStatus === "building" &&
        activePublication.sourceDraftRevision === draftRevision
      ) {
        return {
          releaseId: activePublication._id,
          number: activePublication.number,
          reused: false,
        };
      }
      throw new ConvexError(
        "A previous publication is still finishing. Try again shortly.",
      );
    }

    const [queuedExtraction, processingExtraction] = await Promise.all([
      ctx.db
        .query("fileExtractions")
        .withIndex("by_site_status", (q) =>
          q.eq("siteId", siteId).eq("status", "queued"),
        )
        .first(),
      ctx.db
        .query("fileExtractions")
        .withIndex("by_site_status", (q) =>
          q.eq("siteId", siteId).eq("status", "processing"),
        )
        .first(),
    ]);
    if (
      (queuedExtraction &&
        extractionBlocksPublication(queuedExtraction.status)) ||
      (processingExtraction &&
        extractionBlocksPublication(processingExtraction.status))
    ) {
      throw new ConvexError(
        "Document text extraction is still in progress. Try publishing again shortly.",
      );
    }

    const matchingRelease = site.draftBaseReleaseId
      ? await ctx.db.get(site.draftBaseReleaseId)
      : null;
    const pendingChange = await ctx.db
      .query("draftChanges")
      .withIndex("by_site", (q) => q.eq("siteId", siteId))
      .first();
    if (
      matchingRelease &&
      (matchingRelease.publicationStatus === undefined ||
        matchingRelease.publicationStatus === "complete") &&
      !pendingChange
    ) {
      if (site.liveReleaseId === matchingRelease._id) {
        throw new ConvexError("This draft is already live");
      }
      const currentRelease = site.liveReleaseId
        ? await ctx.db.get(site.liveReleaseId)
        : null;
      const now = Date.now();
      await ctx.db.patch(siteId, {
        liveReleaseId: matchingRelease._id,
        updatedAt: now,
      });
      await ctx.db.insert("publicationEvents", {
        siteId,
        action: publicationActionForTarget(
          currentRelease?.number,
          matchingRelease.number,
        ),
        fromReleaseId: site.liveReleaseId,
        toReleaseId: matchingRelease._id,
        actorId: auth.userId,
        createdAt: now,
      });
      return {
        releaseId: matchingRelease._id,
        number: matchingRelease.number,
        reused: true,
      };
    }

    if (site.liveReleaseId && !pendingChange) {
      throw new ConvexError("There are no unpublished changes");
    }

    if (site.defaultPageId) {
      const defaultPage = await ctx.db.get(site.defaultPageId);
      if (
        !defaultPage ||
        defaultPage.siteId !== siteId ||
        defaultPage.deletedAt !== undefined
      ) {
        throw new ConvexError("The default page is missing from the draft");
      }
    }

    const now = Date.now();
    const number = site.nextReleaseNumber ?? 1;
    const publicationToken = crypto.randomUUID();
    const releaseId = await ctx.db.insert("siteReleases", {
      siteId,
      number,
      name: site.name,
      logoFileId: site.logoFileId,
      defaultPageId: site.defaultPageId,
      settings: site.settings,
      sourceDraftRevision: draftRevision,
      previousReleaseId: site.draftBaseReleaseId,
      createdBy: auth.userId,
      createdAt: now,
      pageCount: 0,
      changeCount: 0,
      publicationStatus: "building",
      publicationToken,
      publicationPhase: "pages",
      publicationAttempt: 0,
      publicationUpdatedAt: now,
    });
    await ctx.db.patch(siteId, {
      nextReleaseNumber: number + 1,
      updatedAt: now,
    });
    await ctx.scheduler.runAfter(0, internal.releasePublication.processBatch, {
      releaseId,
      token: publicationToken,
      phase: "pages",
      attempt: 0,
    });
    return { releaseId, number, reused: false };
  },
});

export const makeLive = mutation({
  args: {
    releaseId: v.id("siteReleases"),
  },
  returns: v.null(),
  handler: async (ctx, { releaseId }) => {
    const release = await ctx.db.get(releaseId);
    if (!release) throw new ConvexError("Release not found or unavailable");
    const site = await ctx.db.get(release.siteId);
    if (!site) throw new ConvexError("Release not found or unavailable");
    const { auth } = await requireOrganizationPermission(
      ctx,
      site.organizationId,
      { resource: "publication", action: "publish" },
    );
    if (
      release.publicationStatus !== undefined &&
      release.publicationStatus !== "complete"
    ) {
      throw new ConvexError("Release publication is not complete");
    }
    if (site.activeDraftRestoreId) {
      throw new ConvexError(
        "A historical version is currently being restored. Try again when it finishes.",
      );
    }
    if (site.liveReleaseId === releaseId) return null;
    const currentRelease = site.liveReleaseId
      ? await ctx.db.get(site.liveReleaseId)
      : null;
    const action = publicationActionForTarget(
      currentRelease?.number,
      release.number,
    );
    const now = Date.now();
    await ctx.db.patch(site._id, {
      liveReleaseId: releaseId,
      updatedAt: now,
    });
    await ctx.db.insert("publicationEvents", {
      siteId: site._id,
      action,
      fromReleaseId: site.liveReleaseId,
      toReleaseId: releaseId,
      actorId: auth.userId,
      createdAt: now,
    });
    return null;
  },
});

export const unpublish = mutation({
  args: { siteId: v.id("sites") },
  returns: v.null(),
  handler: async (ctx, { siteId }) => {
    const site = await ctx.db.get(siteId);
    if (!site) throw new ConvexError("Site not found or unavailable");
    const { auth } = await requireOrganizationPermission(
      ctx,
      site.organizationId,
      { resource: "publication", action: "publish" },
    );
    if (site.activeDraftRestoreId) {
      throw new ConvexError(
        "A historical version is currently being restored. Try again when it finishes.",
      );
    }
    if (!site.liveReleaseId) return null;
    const now = Date.now();
    await ctx.db.patch(siteId, {
      liveReleaseId: undefined,
      updatedAt: now,
    });
    await ctx.db.insert("publicationEvents", {
      siteId,
      action: "unpublish",
      fromReleaseId: site.liveReleaseId,
      actorId: auth.userId,
      createdAt: now,
    });
    return null;
  },
});

export const restoreToDraft = mutation({
  args: { releaseId: v.id("siteReleases") },
  returns: v.object({ restoreId: v.id("draftRestores"), reused: v.boolean() }),
  handler: async (ctx, { releaseId }) => {
    const release = await ctx.db.get(releaseId);
    if (!release) throw new ConvexError("Release not found or unavailable");
    const site = await ctx.db.get(release.siteId);
    if (!site) throw new ConvexError("Release not found or unavailable");
    const { auth } = await requireOrganizationPermission(
      ctx,
      site.organizationId,
      { resource: "content", action: "edit" },
    );
    if (
      release.publicationStatus !== undefined &&
      release.publicationStatus !== "complete"
    ) {
      throw new ConvexError("Release publication is not complete");
    }
    if (site.activeDraftRestoreId) {
      const active = await ctx.db.get(site.activeDraftRestoreId);
      if (
        active?.releaseId === releaseId &&
        active.requestedBy === auth.userId &&
        active.status !== "failed" &&
        active.status !== "cancelled"
      ) {
        return { restoreId: active._id, reused: true };
      }
      throw new ConvexError("Another draft restore is already in progress");
    }
    const activePublication = (
      await Promise.all(
        nonterminalPublicationStatuses.map((status) =>
          ctx.db
            .query("siteReleases")
            .withIndex("by_site_publication_status", (q) =>
              q.eq("siteId", site._id).eq("publicationStatus", status),
            )
            .first(),
        ),
      )
    ).find(Boolean);
    if (activePublication) {
      throw new ConvexError(
        "A publication is still finishing. Try restoring when it completes.",
      );
    }
    const now = Date.now();
    const token = crypto.randomUUID();
    const restoreId = await ctx.db.insert("draftRestores", {
      siteId: site._id,
      releaseId,
      requestedBy: auth.userId,
      baseDraftRevision: site.draftRevision ?? 0,
      status: "validating",
      phase: "validatePages",
      token,
      attempt: 0,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.patch(site._id, { activeDraftRestoreId: restoreId });
    await ctx.scheduler.runAfter(0, internal.draftRestore.processBatch, {
      restoreId,
      token,
      phase: "validatePages",
      attempt: 0,
    });
    return { restoreId, reused: false };
  },
});

export const getDraftRestoreStatus = query({
  args: { restoreId: v.id("draftRestores") },
  returns: v.union(
    v.null(),
    v.object({
      status: v.union(
        v.literal("validating"),
        v.literal("applying"),
        v.literal("paused"),
        v.literal("complete"),
        v.literal("failed"),
        v.literal("cancelled"),
      ),
      phase: v.string(),
      failure: v.optional(v.string()),
      resultDraftRevision: v.optional(v.number()),
    }),
  ),
  handler: async (ctx, { restoreId }) => {
    const restore = await ctx.db.get(restoreId);
    if (!restore || !(await requireSiteForMember(ctx, restore.siteId))) {
      return null;
    }
    return {
      status: restore.status,
      phase: restore.phase,
      failure: restore.failure,
      resultDraftRevision: restore.resultDraftRevision,
    };
  },
});

export const resumeDraftRestore = mutation({
  args: { restoreId: v.id("draftRestores") },
  returns: v.null(),
  handler: async (ctx, { restoreId }) => {
    const restore = await ctx.db.get(restoreId);
    if (!restore) {
      throw new ConvexError("Draft restore not found or unavailable");
    }
    const site = await ctx.db.get(restore.siteId);
    if (!site) {
      throw new ConvexError("Draft restore not found or unavailable");
    }
    await requireOrganizationPermission(ctx, site.organizationId, {
      resource: "content",
      action: "edit",
    });
    if (
      restore.status !== "paused" ||
      site.activeDraftRestoreId !== restore._id
    ) {
      throw new ConvexError("This draft restore cannot be resumed");
    }
    const token = crypto.randomUUID();
    await ctx.db.patch(restore._id, {
      status: "applying",
      token,
      attempt: 0,
      failure: undefined,
      updatedAt: Date.now(),
    });
    await ctx.scheduler.runAfter(0, internal.draftRestore.processBatch, {
      restoreId,
      token,
      phase: restore.phase as
        | "archivePages"
        | "restorePages"
        | "archiveLibraries"
        | "restoreLibraries"
        | "archiveFolders"
        | "restoreFolders"
        | "archiveFiles"
        | "restoreFiles"
        | "synchronizeParents"
        | "clearDraftChanges"
        | "activate",
      cursor: restore.cursor,
      attempt: 0,
    });
    return null;
  },
});

export const cancelDraftRestore = mutation({
  args: { restoreId: v.id("draftRestores") },
  returns: v.null(),
  handler: async (ctx, { restoreId }) => {
    const restore = await ctx.db.get(restoreId);
    if (!restore) {
      throw new ConvexError("Draft restore not found or unavailable");
    }
    const site = await ctx.db.get(restore.siteId);
    if (!site) {
      throw new ConvexError("Draft restore not found or unavailable");
    }
    await requireOrganizationPermission(ctx, site.organizationId, {
      resource: "content",
      action: "edit",
    });
    if (restore.status !== "validating") {
      throw new ConvexError(
        "A restore can only be cancelled before draft application begins",
      );
    }
    const now = Date.now();
    if (site.activeDraftRestoreId === restore._id) {
      await ctx.db.patch(site._id, { activeDraftRestoreId: undefined });
    }
    await ctx.db.patch(restore._id, {
      status: "cancelled",
      token: crypto.randomUUID(),
      failure: undefined,
      completedAt: now,
      updatedAt: now,
    });
    return null;
  },
});
