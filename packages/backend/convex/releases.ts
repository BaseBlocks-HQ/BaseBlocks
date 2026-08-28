import { ConvexError, v } from "convex/values";
import type { GenericMutationCtx } from "convex/server";
import { getStatus, type WorkflowId } from "@convex-dev/workflow";
import { components, internal } from "./_generated/api";
import type { DataModel, Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import {
  extractionBlocksPublication,
  isPublicationInFlight,
  isReleaseAvailable,
} from "./model/releaseState";
import { buildDraftSummary } from "./model/draftSummary";
import { promoteRelease } from "./model/releaseOperations";
import { buildHistoricalReleaseContent } from "./model/releaseChangeDetails";
import {
  snapshotChanges,
  snapshotFiles,
  snapshotFolders,
  snapshotLibraries,
  snapshotPages,
  clearPublishedDraftChanges,
} from "./publication";
import {
  isOrganizationMember,
  requireOrganizationPermission,
} from "./permissions";
import { assertDraftReadable } from "./model/draft";
import {
  releaseChangeType,
  releaseEntityType,
  releaseSummary,
  releaseSummaryValidator,
} from "./validators/releases";

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

export const getDraftSummary = query({
  args: { siteId: v.id("sites") },
  returns: v.union(
    v.null(),
    v.object({
      draftRevision: v.number(),
      liveRelease: v.union(
        v.null(),
        v.object({ _id: v.id("siteReleases"), number: v.number() }),
      ),
      nextReleaseNumber: v.number(),
      hasUnpublishedChanges: v.boolean(),
    }),
  ),
  handler: async (ctx, { siteId }) => {
    const site = await requireSiteForMember(ctx, siteId);
    if (!site) return null;
    return buildDraftSummary(ctx, site);
  },
});

export const getDraftChanges = query({
  args: { siteId: v.id("sites") },
  returns: v.union(
    v.null(),
    v.array(
      v.object({
        entityType: releaseEntityType,
        entityId: v.string(),
        changeType: releaseChangeType,
        label: v.string(),
        details: v.array(v.string()),
      }),
    ),
  ),
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
          entityType: "site" as const,
          entityId: siteId,
          changeType: "updated" as const,
          label: "Published version",
          details: ["Draft and live version differ"],
        },
      ];
    }
    return changes.map((change) => ({
      entityType: change.entityType,
      entityId: change.entityId,
      changeType: change.changeType,
      label: change.label,
      details: change.details,
    }));
  },
});

/**
 * Backward-compatible read for clients that still poll the retired workflow.
 * Atomic releases have no workflow status and are complete at creation time.
 */
export const getPublicationStatus = query({
  args: { releaseId: v.id("siteReleases") },
  returns: v.union(
    v.null(),
    v.object({
      status: v.union(
        v.literal("building"),
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
    if (
      isPublicationInFlight(release.publicationStatus) &&
      !release.publicationWorkflowId
    ) {
      return {
        status: "failed" as const,
        failure: "Publication workflow state is missing",
      };
    }
    if (
      isPublicationInFlight(release.publicationStatus) &&
      release.publicationWorkflowId
    ) {
      const workflowStatus = await getStatus(
        ctx,
        components.workflow,
        release.publicationWorkflowId as WorkflowId,
      );
      if (workflowStatus.type === "failed") {
        return { status: "failed" as const, failure: workflowStatus.error };
      }
    }
    return {
      status: release.publicationStatus ?? ("complete" as const),
      failure: release.publicationFailure,
    };
  },
});

export const list = query({
  args: { siteId: v.id("sites") },
  returns: v.array(releaseSummaryValidator),
  handler: async (ctx, { siteId }) => {
    const site = await requireSiteForMember(ctx, siteId);
    if (!site) return [];
    const releases = await ctx.db
      .query("siteReleases")
      .withIndex("by_site_number", (q) => q.eq("siteId", siteId))
      .order("desc")
      .collect();
    return releases
      .filter(isReleaseAvailable)
      .map((release) => releaseSummary(release, site.liveReleaseId));
  },
});

export const get = query({
  args: { releaseId: v.id("siteReleases") },
  returns: v.union(
    v.null(),
    v.object({
      release: releaseSummaryValidator,
      changes: v.array(
        v.object({
          entityType: releaseEntityType,
          entityId: v.string(),
          changeType: releaseChangeType,
          label: v.string(),
          fields: v.array(
            v.object({
              label: v.string(),
              before: v.optional(v.string()),
              after: v.optional(v.string()),
            }),
          ),
          content: v.optional(
            v.object({
              beforeLines: v.array(v.string()),
              afterLines: v.array(v.string()),
            }),
          ),
        }),
      ),
    }),
  ),
  handler: async (ctx, { releaseId }) => {
    const release = await ctx.db.get(releaseId);
    if (!release || !isReleaseAvailable(release)) return null;
    const site = await requireSiteForMember(ctx, release.siteId);
    if (!site) return null;
    const changes = await ctx.db
      .query("releaseChanges")
      .withIndex("by_release", (q) => q.eq("releaseId", releaseId))
      .collect();
    const projectedChanges = await Promise.all(
      changes.map(async (change) => ({
        entityType: change.entityType,
        entityId: change.entityId,
        changeType: change.changeType,
        label: change.label,
        fields: change.fields,
        content: await buildHistoricalReleaseContent(ctx, release, change),
      })),
    );
    return {
      release: releaseSummary(release, site.liveReleaseId),
      changes: projectedChanges,
    };
  },
});

/**
 * Publishing is atomic: the release manifest is built and activated in a
 * single transaction. The user-visible site switches when this mutation
 * commits; search projection runs as a derived background job.
 */
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
    const draftRevision = site.draftRevision;
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

    const matchingRelease = site.draftBaseReleaseId
      ? await ctx.db.get(site.draftBaseReleaseId)
      : null;
    if (
      matchingRelease &&
      (matchingRelease.siteId !== siteId ||
        !isReleaseAvailable(matchingRelease))
    ) {
      throw new ConvexError("The draft base version is unavailable");
    }
    const pendingChange = await ctx.db
      .query("draftChanges")
      .withIndex("by_site", (q) => q.eq("siteId", siteId))
      .first();
    if (matchingRelease && !pendingChange) {
      if (site.liveReleaseId === matchingRelease._id) {
        throw new ConvexError("This draft is already live");
      }
      const liveSearchProjectionGeneration = await promoteRelease(
        ctx,
        site,
        matchingRelease,
        auth.userId,
      );
      await scheduleLiveSearchProjection(
        ctx,
        siteId,
        matchingRelease._id,
        liveSearchProjectionGeneration,
      );
      return {
        releaseId: matchingRelease._id,
        number: matchingRelease.number,
        reused: true,
      };
    }

    if (site.liveReleaseId && !pendingChange) {
      throw new ConvexError("There are no unpublished changes");
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
    const number = site.nextReleaseNumber;
    const releaseId = await ctx.db.insert("siteReleases", {
      siteId,
      number,
      name: site.name,
      logoFileId: site.logoFileId,
      faviconFileId: site.faviconFileId,
      defaultPageId: site.defaultPageId,
      settings: site.settings,
      sourceDraftRevision: draftRevision,
      previousReleaseId: site.draftBaseReleaseId,
      createdBy: auth.userId,
      createdAt: now,
      pageCount: 0,
      changeCount: 0,
    });

    // Change details diff the draft against the previous base release, so
    // they must be captured before activation moves the base pointer.
    const changeCount = await snapshotChanges(ctx, site, releaseId);
    const pageCount = await snapshotPages(ctx, releaseId, siteId);
    if (pageCount === 0) {
      throw new ConvexError("The site must contain at least one page");
    }
    await snapshotLibraries(ctx, releaseId, siteId);
    await snapshotFolders(ctx, releaseId, siteId);
    await snapshotFiles(ctx, releaseId, siteId, site);

    await ctx.db.patch(releaseId, { pageCount, changeCount });
    const liveSearchProjectionGeneration = await activateRelease(
      ctx,
      site,
      releaseId,
      auth.userId,
    );
    await clearPublishedDraftChanges(ctx, siteId);

    await ctx.db.patch(siteId, {
      nextReleaseNumber: number + 1,
      updatedAt: now,
    });
    await scheduleLiveSearchProjection(
      ctx,
      siteId,
      releaseId,
      liveSearchProjectionGeneration,
    );
    return { releaseId, number, reused: false };
  },
});

async function activateRelease(
  ctx: GenericMutationCtx<DataModel>,
  site: NonNullable<Awaited<ReturnType<typeof requireSiteForMember>>>,
  releaseId: Id<"siteReleases">,
  actorId: string,
) {
  const now = Date.now();
  const liveSearchProjectionGeneration =
    (site.liveSearchProjectionGeneration ?? 0) + 1;
  await ctx.db.patch(site._id, {
    liveReleaseId: releaseId,
    draftBaseReleaseId: releaseId,
    updatedAt: now,
    liveSearchProjectionGeneration,
  });
  await ctx.db.insert("publicationEvents", {
    siteId: site._id,
    action: site.liveReleaseId ? "update" : "publish",
    fromReleaseId: site.liveReleaseId,
    toReleaseId: releaseId,
    actorId,
    createdAt: now,
  });
  return liveSearchProjectionGeneration;
}

async function scheduleLiveSearchProjection(
  ctx: Pick<GenericMutationCtx<DataModel>, "scheduler">,
  siteId: Id<"sites">,
  liveReleaseId: Id<"siteReleases"> | undefined,
  liveSearchProjectionGeneration: number,
) {
  await ctx.scheduler.runAfter(0, internal.publication.projectLiveSearch, {
    siteId,
    expectedLiveReleaseId: liveReleaseId,
    expectedLiveSearchProjectionGeneration: liveSearchProjectionGeneration,
  });
}

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
    if (!isReleaseAvailable(release)) {
      throw new ConvexError("Release publication is not complete");
    }
    if (site.activeDraftRestoreId) {
      throw new ConvexError(
        "A historical version is currently being restored. Try again when it finishes.",
      );
    }
    if (site.liveReleaseId === releaseId) return null;
    const liveSearchProjectionGeneration = await promoteRelease(
      ctx,
      site,
      release,
      auth.userId,
    );
    await scheduleLiveSearchProjection(
      ctx,
      site._id,
      releaseId,
      liveSearchProjectionGeneration,
    );
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
    const liveSearchProjectionGeneration =
      (site.liveSearchProjectionGeneration ?? 0) + 1;
    await ctx.db.patch(siteId, {
      liveReleaseId: undefined,
      updatedAt: now,
      liveSearchProjectionGeneration,
    });
    await ctx.db.insert("publicationEvents", {
      siteId,
      action: "unpublish",
      fromReleaseId: site.liveReleaseId,
      actorId: auth.userId,
      createdAt: now,
    });
    await scheduleLiveSearchProjection(
      ctx,
      siteId,
      undefined,
      liveSearchProjectionGeneration,
    );
    return null;
  },
});
