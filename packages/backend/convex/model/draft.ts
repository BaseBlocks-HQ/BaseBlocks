import type { GenericMutationCtx } from "convex/server";
import type { DataModel, Id } from "../_generated/dataModel";
import { reconcileDraftChanges, type DraftEntityRef } from "./draftChanges";

type MutationCtx = Pick<GenericMutationCtx<DataModel>, "db">;

export async function touchSiteDraft(
  ctx: MutationCtx,
  siteId: Id<"sites">,
  now = Date.now(),
  entities: DraftEntityRef[] = [{ entityType: "site", entityId: siteId }],
): Promise<number> {
  const site = await ctx.db.get(siteId);
  if (!site) throw new Error("Site not found");
  const draftRevision = (site.draftRevision ?? 0) + 1;
  await ctx.db.patch(siteId, { draftRevision, updatedAt: now });
  await reconcileDraftChanges(ctx, site, entities, now);
  return draftRevision;
}
