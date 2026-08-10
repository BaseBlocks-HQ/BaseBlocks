import { v } from "convex/values";
import { internalMutation, query } from "./_generated/server";
import { requireOrganizationMember } from "./permissions";

export const getWorkspaceUsage = query({
  args: { organizationId: v.string() },
  handler: async (ctx, { organizationId }) => {
    await requireOrganizationMember(ctx, organizationId);
    return await ctx.db
      .query("workspaceStorageUsage")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", organizationId),
      )
      .unique();
  },
});

export const reconcileWorkspace = internalMutation({
  args: { organizationId: v.string() },
  handler: async (ctx, { organizationId }) => {
    const now = Date.now();
    const runId = await ctx.db.insert("storageTelemetryReconciliations", {
      organizationId,
      status: "running",
      observedActiveFileBytes: 0n,
      observedRetainedFileBytes: 0n,
      observedContentPayloadBytes: 0n,
      observedLogicalRevisionBytes: 0n,
      reconciliationVersion: "storage-v1",
      startedAt: now,
      updatedAt: now,
    });
    try {
      const sites = await ctx.db
        .query("sites")
        .withIndex("by_organization", (q) =>
          q.eq("organizationId", organizationId),
        )
        .collect();
      let activeFileBytes = 0n;
      let retainedFileBytes = 0n;
      let contentPayloadBytes = 0n;
      let logicalRevisionBytes = 0n;
      let activeFileCount = 0;
      let retainedFileCount = 0;
      let contentPayloadCount = 0;
      for (const site of sites) {
        const [files, payloads, revisions] = await Promise.all([
          ctx.db
            .query("files")
            .withIndex("by_site", (q) => q.eq("siteId", site._id))
            .collect(),
          ctx.db
            .query("contentPayloads")
            .withIndex("by_site_hash", (q) => q.eq("siteId", site._id))
            .collect(),
          ctx.db
            .query("contentRevisions")
            .withIndex("by_site_hash", (q) => q.eq("siteId", site._id))
            .collect(),
        ]);
        for (const file of files) {
          if (file.deletedAt === undefined) {
            activeFileBytes += BigInt(file.size);
            activeFileCount += 1;
          } else {
            retainedFileBytes += BigInt(file.size);
            retainedFileCount += 1;
          }
        }
        for (const payload of payloads)
          contentPayloadBytes += BigInt(payload.contentSize);
        for (const revision of revisions)
          logicalRevisionBytes += BigInt(revision.contentSize);
        contentPayloadCount += payloads.length;
      }
      const current = await ctx.db
        .query("workspaceStorageUsage")
        .withIndex("by_organization", (q) =>
          q.eq("organizationId", organizationId),
        )
        .unique();
      const value = {
        organizationId,
        activeFileBytes,
        retainedFileBytes,
        contentPayloadBytes,
        logicalRevisionBytes,
        activeFileCount,
        retainedFileCount,
        contentPayloadCount,
        lastReconciledAt: now,
        reconciliationVersion: "storage-v1",
        updatedAt: now,
      };
      if (current) await ctx.db.patch(current._id, value);
      else
        await ctx.db.insert("workspaceStorageUsage", {
          ...value,
          createdAt: now,
        });
      await ctx.db.patch(runId, {
        status: "completed",
        observedActiveFileBytes: activeFileBytes,
        observedRetainedFileBytes: retainedFileBytes,
        observedContentPayloadBytes: contentPayloadBytes,
        observedLogicalRevisionBytes: logicalRevisionBytes,
        completedAt: now,
        updatedAt: now,
      });
      return value;
    } catch (error) {
      await ctx.db.patch(runId, {
        status: "failed",
        failureCode: error instanceof Error ? error.name : "UNKNOWN",
        completedAt: Date.now(),
        updatedAt: Date.now(),
      });
      throw error;
    }
  },
});
