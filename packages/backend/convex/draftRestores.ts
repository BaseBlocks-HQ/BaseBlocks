import {
  cancel as cancelWorkflow,
  getStatus,
  restart,
  start,
  type WorkflowId,
} from "@convex-dev/workflow";
import { ConvexError, v } from "convex/values";
import { components, internal } from "./_generated/api";
import { mutation, query } from "./_generated/server";
import { findActivePublication } from "./model/releaseOperations";
import {
  isOrganizationMember,
  requireOrganizationPermission,
} from "./permissions";

export const restore = mutation({
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
    if (release.publicationStatus !== "complete") {
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
    if (await findActivePublication(ctx, site._id)) {
      throw new ConvexError(
        "A publication is still finishing. Try restoring when it completes.",
      );
    }
    const now = Date.now();
    const restoreId = await ctx.db.insert("draftRestores", {
      siteId: site._id,
      releaseId,
      requestedBy: auth.userId,
      baseDraftRevision: site.draftRevision,
      status: "validating",
      createdAt: now,
      updatedAt: now,
    });
    const workflowId = await start(
      ctx,
      internal.draftRestore.run,
      { restoreId },
      { startAsync: true },
    );
    await ctx.db.patch(restoreId, { workflowId });
    await ctx.db.patch(site._id, { activeDraftRestoreId: restoreId });
    return { restoreId, reused: false };
  },
});

export const status = query({
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
      failure: v.optional(v.string()),
      resultDraftRevision: v.optional(v.number()),
    }),
  ),
  handler: async (ctx, { restoreId }) => {
    const restore = await ctx.db.get(restoreId);
    if (!restore) return null;
    const site = await ctx.db.get(restore.siteId);
    if (!site || !(await isOrganizationMember(ctx, site.organizationId))) {
      return null;
    }
    if (
      restore.workflowId &&
      (restore.status === "validating" || restore.status === "applying")
    ) {
      const workflowStatus = await getStatus(
        ctx,
        components.workflow,
        restore.workflowId as WorkflowId,
      );
      if (workflowStatus.type === "failed") {
        return {
          status:
            restore.status === "validating"
              ? ("failed" as const)
              : ("paused" as const),
          failure: workflowStatus.error,
          resultDraftRevision: restore.resultDraftRevision,
        };
      }
    }
    return {
      status: restore.status,
      failure: restore.failure,
      resultDraftRevision: restore.resultDraftRevision,
    };
  },
});

export const resume = mutation({
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
      !restore.workflowId ||
      site.activeDraftRestoreId !== restore._id
    ) {
      throw new ConvexError("This draft restore cannot be resumed");
    }
    const workflowStatus = await getStatus(
      ctx,
      components.workflow,
      restore.workflowId as WorkflowId,
    );
    if (workflowStatus.type !== "failed") {
      throw new ConvexError("This draft restore cannot be resumed");
    }
    await ctx.db.patch(restoreId, {
      status: "applying",
      failure: undefined,
      updatedAt: Date.now(),
    });
    await restart(ctx, components.workflow, restore.workflowId as WorkflowId, {
      startAsync: true,
    });
    return null;
  },
});

export const cancel = mutation({
  args: { restoreId: v.id("draftRestores") },
  returns: v.null(),
  handler: async (ctx, { restoreId }) => {
    const restore = await ctx.db.get(restoreId);
    if (!restore) {
      throw new ConvexError("Draft restore not found or unavailable");
    }
    const site = await ctx.db.get(restore.siteId);
    if (!site) throw new ConvexError("Draft restore not found or unavailable");
    await requireOrganizationPermission(ctx, site.organizationId, {
      resource: "content",
      action: "edit",
    });
    if (restore.status !== "validating" || !restore.workflowId) {
      throw new ConvexError(
        "A restore can only be cancelled before draft application begins",
      );
    }
    await cancelWorkflow(
      ctx,
      components.workflow,
      restore.workflowId as WorkflowId,
    );
    const now = Date.now();
    if (site.activeDraftRestoreId === restoreId) {
      await ctx.db.patch(site._id, { activeDraftRestoreId: undefined });
    }
    await ctx.db.patch(restoreId, {
      status: "cancelled",
      failure: undefined,
      completedAt: now,
      updatedAt: now,
    });
    return null;
  },
});
