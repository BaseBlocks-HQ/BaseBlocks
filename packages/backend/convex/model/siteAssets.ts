import type { GenericMutationCtx, GenericQueryCtx } from "convex/server";
import type { DataModel, Doc, Id } from "../_generated/dataModel";
import { recordStorageUsageEvent } from "./storageTelemetry";

type ReadCtx = Pick<GenericQueryCtx<DataModel>, "db">;
type WriteCtx = Pick<GenericMutationCtx<DataModel>, "db">;

export const PENDING_SITE_ASSET_TTL_MS = 48 * 60 * 60 * 1000;
export const RETIRED_SITE_ASSET_GRACE_MS = 60 * 60 * 1000;

function isSiteAsset(file: Doc<"files"> | null): file is Doc<"files"> {
  return file?.kind === "siteAsset";
}

async function isReferencedByDraftPage(
  ctx: ReadCtx,
  file: Doc<"files">,
): Promise<boolean> {
  const documents = await ctx.db
    .query("pageDocuments")
    .withIndex("by_site", (query) => query.eq("siteId", file.siteId))
    .collect();
  for (const document of documents) {
    const page = await ctx.db.get(document.pageId);
    if (!page || page.deletedAt !== undefined) continue;
    const revision = await ctx.db.get(document.revisionId);
    if (revision?.fileIds.includes(file._id)) return true;
  }
  return false;
}

export async function isSiteAssetReferencedByDraft(
  ctx: ReadCtx,
  file: Doc<"files">,
): Promise<boolean> {
  if (!isSiteAsset(file)) return false;
  const site = await ctx.db.get(file.siteId);
  if (!site) return false;
  if (site.logoFileId === file._id || site.faviconFileId === file._id) {
    return true;
  }
  return isReferencedByDraftPage(ctx, file);
}

export async function isSiteAssetReferenced(
  ctx: ReadCtx,
  file: Doc<"files">,
): Promise<boolean> {
  if (await isSiteAssetReferencedByDraft(ctx, file)) return true;
  return Boolean(
    await ctx.db
      .query("releaseFiles")
      .withIndex("by_file", (query) => query.eq("fileId", file._id))
      .first(),
  );
}

export async function attachSiteAsset(
  ctx: WriteCtx,
  siteId: Id<"sites">,
  fileId: Id<"files">,
  now = Date.now(),
) {
  const file = await ctx.db.get(fileId);
  if (
    !isSiteAsset(file) ||
    file.siteId !== siteId ||
    file.assetState === "deleting"
  ) {
    throw new Error("Invalid site asset");
  }
  if (file.deletedAt !== undefined) {
    const site = await ctx.db.get(siteId);
    if (!site) throw new Error("Site not found");
    await recordStorageUsageEvent(ctx, {
      organizationId: site.organizationId,
      siteId,
      fileId,
      kind: "restore",
      bytes: file.size,
      idempotencyKey: `file:restore:${fileId}:${now}`,
      now,
    });
  }
  await ctx.db.patch(fileId, {
    assetState: "attached",
    assetAttachedAt: file.assetAttachedAt ?? now,
    assetExpiresAt: undefined,
    assetPurgeAfter: undefined,
    assetPurgeError: undefined,
    deletedAt: undefined,
  });
  return file;
}

async function retireSiteAsset(
  ctx: WriteCtx,
  file: Doc<"files">,
  now: number,
  purgeAfter: number,
) {
  if (file.assetState === "retired" && file.assetPurgeAfter !== undefined) {
    return;
  }
  const site = await ctx.db.get(file.siteId);
  if (site && file.deletedAt === undefined) {
    await recordStorageUsageEvent(ctx, {
      organizationId: site.organizationId,
      siteId: site._id,
      fileId: file._id,
      kind: "softDelete",
      bytes: file.size,
      idempotencyKey: `file:delete:${file._id}:${now}`,
      now,
    });
  }
  await ctx.db.patch(file._id, {
    assetState: "retired",
    assetExpiresAt: undefined,
    assetPurgeAfter: purgeAfter,
    assetPurgeError: undefined,
    deletedAt: file.deletedAt ?? now,
  });
}

export async function reconcileSiteAsset(
  ctx: WriteCtx,
  fileId: Id<"files">,
  options: { now?: number; abandonPending?: boolean } = {},
) {
  const file = await ctx.db.get(fileId);
  if (!isSiteAsset(file) || file.assetState === "deleting") return;
  const now = options.now ?? Date.now();
  if (await isSiteAssetReferenced(ctx, file)) {
    await attachSiteAsset(ctx, file.siteId, file._id, now);
    return;
  }
  if (file.assetState === "pending" && !options.abandonPending) return;
  await retireSiteAsset(
    ctx,
    file,
    now,
    options.abandonPending ? now : now + RETIRED_SITE_ASSET_GRACE_MS,
  );
}

export async function synchronizeDraftPageSiteAssets(
  ctx: WriteCtx,
  siteId: Id<"sites">,
  previousFileIds: readonly Id<"files">[],
  nextFileIds: readonly Id<"files">[],
  now = Date.now(),
) {
  const previous = new Set(previousFileIds);
  const next = new Set(nextFileIds);
  for (const fileId of next) {
    const file = await ctx.db.get(fileId);
    if (isSiteAsset(file)) await attachSiteAsset(ctx, siteId, fileId, now);
  }
  for (const fileId of previous) {
    if (next.has(fileId)) continue;
    const file = await ctx.db.get(fileId);
    if (isSiteAsset(file)) await reconcileSiteAsset(ctx, fileId, { now });
  }
}

export async function claimSiteAssetForPurge(
  ctx: WriteCtx,
  fileId: Id<"files">,
  now = Date.now(),
) {
  let file = await ctx.db.get(fileId);
  if (!isSiteAsset(file) || file.assetState === "deleting") return null;
  if (await isSiteAssetReferenced(ctx, file)) {
    await attachSiteAsset(ctx, file.siteId, file._id, now);
    return null;
  }
  if (
    file.assetState === "attached" ||
    file.assetPurgeAfter === undefined ||
    file.assetPurgeAfter > now
  ) {
    return null;
  }
  if (file.assetState === "pending") {
    await retireSiteAsset(ctx, file, now, now);
    file = await ctx.db.get(fileId);
    if (!isSiteAsset(file)) return null;
  }
  await ctx.db.patch(file._id, {
    assetState: "deleting",
    assetPurgeError: undefined,
  });
  return { fileId: file._id, objectKey: file.objectKey };
}
