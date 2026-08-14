import { ConvexError, v } from "convex/values";
import {
  getStatus,
  restart,
  start,
  type WorkflowId,
} from "@convex-dev/workflow";
import { components, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import {
  extractionBlocksPublication,
  isPublicationInFlight,
} from "./model/releaseState";
import { buildDraftSummary } from "./model/draftSummary";
import {
  findActivePublication,
  promoteRelease,
} from "./model/releaseOperations";
import { buildHistoricalReleaseContent } from "./model/releaseChangeDetails";
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
      status: release.publicationStatus,
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
      .withIndex("by_site_publication_status", (q) =>
        q.eq("siteId", siteId).eq("publicationStatus", "complete"),
      )
      .order("desc")
      .collect();
    return releases.map((release) =>
      releaseSummary(release, site.liveReleaseId),
    );
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
    if (release?.publicationStatus !== "complete") {
      return null;
    }
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

    const activePublication = await findActivePublication(ctx, siteId);
    if (
      activePublication &&
      isPublicationInFlight(activePublication.publicationStatus)
    ) {
      if (!activePublication.publicationWorkflowId) {
        throw new ConvexError("Publication workflow state is missing");
      }
      const workflowStatus = await getStatus(
        ctx,
        components.workflow,
        activePublication.publicationWorkflowId as WorkflowId,
      );
      if (workflowStatus.type === "failed") {
        await restart(
          ctx,
          components.workflow,
          activePublication.publicationWorkflowId as WorkflowId,
          { startAsync: true },
        );
        if (activePublication.sourceDraftRevision !== draftRevision) {
          throw new ConvexError(
            "A previous publication recovery was restarted. Try publishing the latest draft again shortly.",
          );
        }
      }
      if (activePublication.sourceDraftRevision === draftRevision) {
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

    const matchingRelease = site.draftBaseReleaseId
      ? await ctx.db.get(site.draftBaseReleaseId)
      : null;
    const pendingChange = await ctx.db
      .query("draftChanges")
      .withIndex("by_site", (q) => q.eq("siteId", siteId))
      .first();
    if (
      matchingRelease &&
      matchingRelease.publicationStatus === "complete" &&
      !pendingChange
    ) {
      if (site.liveReleaseId === matchingRelease._id) {
        throw new ConvexError("This draft is already live");
      }
      await promoteRelease(ctx, site, matchingRelease, auth.userId);
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
      defaultPageId: site.defaultPageId,
      settings: site.settings,
      sourceDraftRevision: draftRevision,
      previousReleaseId: site.draftBaseReleaseId,
      createdBy: auth.userId,
      createdAt: now,
      pageCount: 0,
      changeCount: 0,
      publicationStatus: "building",
      publicationUpdatedAt: now,
    });
    await ctx.db.patch(siteId, {
      nextReleaseNumber: number + 1,
      updatedAt: now,
    });
    const publicationWorkflowId = await start(
      ctx,
      internal.releasePublication.run,
      { releaseId },
      { startAsync: true },
    );
    await ctx.db.patch(releaseId, { publicationWorkflowId });
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
    if (release.publicationStatus !== "complete") {
      throw new ConvexError("Release publication is not complete");
    }
    if (site.activeDraftRestoreId) {
      throw new ConvexError(
        "A historical version is currently being restored. Try again when it finishes.",
      );
    }
    if (site.liveReleaseId === releaseId) return null;
    await promoteRelease(ctx, site, release, auth.userId);
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
