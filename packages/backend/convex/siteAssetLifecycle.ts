import { v } from "convex/values";
import { internal } from "./_generated/api";
import {
  internalMutation,
  internalQuery,
  mutation,
  type MutationCtx,
} from "./_generated/server";
import {
  claimSiteAssetForPurge,
  isSiteAssetReferenced,
  reconcileSiteAsset,
} from "./model/siteAssets";
import { recordStorageUsageEvent } from "./model/storageTelemetry";
import { requireOrganizationPermission } from "./permissions";

async function requireManagedAsset(ctx: MutationCtx, fileId: string) {
  const id = ctx.db.normalizeId("files", fileId);
  const file = id ? await ctx.db.get(id) : null;
  if (file?.kind !== "siteAsset") throw new Error("Asset not found");
  const site = await ctx.db.get(file.siteId);
  if (!site) throw new Error("Site not found");
  await requireOrganizationPermission(ctx, site.organizationId, {
    resource: "site",
    action: "manage",
  });
  return file;
}

export const discard = mutation({
  args: { fileId: v.string() },
  returns: v.boolean(),
  handler: async (ctx, { fileId }) => {
    const file = await requireManagedAsset(ctx, fileId);
    if (file.assetState !== "pending") return false;
    if (await isSiteAssetReferenced(ctx, file)) return false;
    await reconcileSiteAsset(ctx, file._id, { abandonPending: true });
    await ctx.scheduler.runAfter(0, internal.siteAssetPurge.purge, {
      fileId: file._id,
    });
    return true;
  },
});

export const claim = internalMutation({
  args: { fileId: v.optional(v.id("files")) },
  handler: async (ctx, { fileId }) => {
    if (fileId) return claimSiteAssetForPurge(ctx, fileId);
    const now = Date.now();
    for (const state of ["pending", "retired"] as const) {
      const candidate = await ctx.db
        .query("files")
        .withIndex("by_asset_state_purge", (query) =>
          query
            .eq("kind", "siteAsset")
            .eq("assetState", state)
            .lte("assetPurgeAfter", now),
        )
        .first();
      if (candidate) return claimSiteAssetForPurge(ctx, candidate._id, now);
    }
    return null;
  },
});

export const completePurge = internalMutation({
  args: { fileId: v.id("files") },
  handler: async (ctx, { fileId }) => {
    const file = await ctx.db.get(fileId);
    if (file?.kind !== "siteAsset" || file.assetState !== "deleting") {
      return false;
    }
    const site = await ctx.db.get(file.siteId);
    if (site) {
      await recordStorageUsageEvent(ctx, {
        organizationId: site.organizationId,
        siteId: site._id,
        fileId,
        kind: "purge",
        bytes: file.size,
        idempotencyKey: `file:purge:${fileId}`,
      });
    }
    await ctx.db.delete(fileId);
    return true;
  },
});

export const failPurge = internalMutation({
  args: { fileId: v.id("files"), failure: v.string() },
  handler: async (ctx, { fileId, failure }) => {
    const file = await ctx.db.get(fileId);
    if (file?.kind !== "siteAsset" || file.assetState !== "deleting") {
      return;
    }
    await ctx.db.patch(fileId, {
      assetState: "retired",
      assetPurgeAfter: Date.now() + 60 * 60 * 1000,
      assetPurgeError: failure.replaceAll(/[\r\n\t]+/gu, " ").slice(0, 300),
    });
  },
});

export const audit = internalQuery({
  args: {},
  handler: async (ctx) => {
    const files = await ctx.db
      .query("files")
      .withIndex("by_asset_state_purge", (query) =>
        query.eq("kind", "siteAsset"),
      )
      .collect();
    const now = Date.now();
    const states = {
      pending: 0,
      attached: 0,
      retired: 0,
      deleting: 0,
      legacy: 0,
      due: 0,
      referenced: 0,
      referencedButInactive: 0,
      unreferencedButAttached: 0,
    };
    for (const file of files) {
      if (file.assetState) states[file.assetState] += 1;
      else states.legacy += 1;
      if (file.assetPurgeAfter !== undefined && file.assetPurgeAfter <= now) {
        states.due += 1;
      }
      const referenced = await isSiteAssetReferenced(ctx, file);
      if (referenced) states.referenced += 1;
      if (
        referenced &&
        (file.assetState !== "attached" || file.deletedAt !== undefined)
      ) {
        states.referencedButInactive += 1;
      }
      if (!referenced && file.assetState === "attached") {
        states.unreferencedButAttached += 1;
      }
    }
    return { total: files.length, states };
  },
});
