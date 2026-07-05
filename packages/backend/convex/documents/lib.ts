import type { Doc } from "../_generated/dataModel";
/**
 * Shared document deletion helper.
 *
 * Centralises the cleanup logic so that every code path that removes a document
 * (single delete, library delete, folder delete, site delete) goes through the
 * same sequence:
 *   1. Remove the searchableContent index entry.
 *   2. Delete the assets row.
 *   3. Delete the document row.
 *   4. Schedule the object deletion (runs after the transaction commits).
 */
import type { MutationCtx } from "../_generated/server";
import { deleteObjectAction } from "../files/actions";
import { deleteDocumentListing } from "./listings";

export async function deleteDocumentRows(
  ctx: MutationCtx,
  document: Doc<"documents">,
): Promise<void> {
  // 1. Remove search index entry
  const searchEntry = await ctx.db
    .query("searchableContent")
    .withIndex("by_source", (q) =>
      q.eq("contentType", "document").eq("sourceId", document._id),
    )
    .first();
  if (searchEntry) {
    await ctx.db.delete(searchEntry._id);
  }

  // 2. Capture asset before deleting it
  const asset = document.assetId ? await ctx.db.get(document.assetId) : null;

  // 3. Delete the asset record
  if (document.assetId) {
    await ctx.db.delete(document.assetId);
  }

  // 4. Delete the document record
  await ctx.db.delete(document._id);

  // 4b. Delete the lightweight listing entry
  await deleteDocumentListing(ctx, document._id);

  // 5. Schedule file deletion (fire-and-forget, after DB commit)
  if (asset) {
    await ctx.scheduler.runAfter(0, deleteObjectAction, {
      objectKey: asset.objectKey,
    });
  }
}
