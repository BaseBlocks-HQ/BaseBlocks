import type { GenericMutationCtx } from "convex/server";
import type { DataModel, Id } from "../_generated/dataModel";
import { ConvexError } from "convex/values";
import { reconcileDraftChanges, type DraftEntityRef } from "./draftChanges";

type MutationCtx = Pick<GenericMutationCtx<DataModel>, "db">;

export function assertDraftWritable(site: {
  activeDraftRestoreId?: Id<"draftRestores">;
}): void {
  if (site.activeDraftRestoreId) {
    throw new ConvexError(
      "A historical version is currently being restored. Try again when the restore finishes.",
    );
  }
}

export function assertDraftReadable(site: {
  activeDraftRestoreId?: Id<"draftRestores">;
}): void {
  if (site.activeDraftRestoreId) {
    throw new ConvexError(
      "The draft is unavailable while a historical version is being restored.",
    );
  }
}

export async function touchSiteDraft(
  ctx: MutationCtx,
  siteId: Id<"sites">,
  now = Date.now(),
  entities: DraftEntityRef[] = [{ entityType: "site", entityId: siteId }],
): Promise<number> {
  const site = await ctx.db.get(siteId);
  if (!site) throw new Error("Site not found");
  assertDraftWritable(site);
  const draftRevision = (site.draftRevision ?? 0) + 1;
  await ctx.db.patch(siteId, { draftRevision, updatedAt: now });
  await reconcileDraftChanges(ctx, site, entities, now, draftRevision);
  return draftRevision;
}
