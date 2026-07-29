import type { GenericMutationCtx, GenericQueryCtx } from "convex/server";
import type { DataModel, Id } from "../_generated/dataModel";
import { isPubliclyPublishedSite } from "../sharing";

type ReadCtx = Pick<
  GenericQueryCtx<DataModel> | GenericMutationCtx<DataModel>,
  "db"
>;
type WriteCtx = Pick<GenericMutationCtx<DataModel>, "db">;

export async function getPublicationState(ctx: ReadCtx, siteId: Id<"sites">) {
  return ctx.db
    .query("publicationStates")
    .withIndex("by_site", (q) => q.eq("siteId", siteId))
    .unique();
}

export async function getPublishedLibraryIds(
  ctx: ReadCtx,
  siteId: Id<"sites">,
): Promise<Set<string>> {
  const state = await getPublicationState(ctx, siteId);
  return new Set(state?.activeLibraryIds ?? []);
}

export async function refreshPublicationState(
  ctx: WriteCtx,
  siteId: Id<"sites">,
): Promise<void> {
  const [site, references, existingState, searchEntries] = await Promise.all([
    ctx.db.get(siteId),
    ctx.db
      .query("pageReferences")
      .withIndex("by_site", (q) => q.eq("siteId", siteId))
      .collect(),
    getPublicationState(ctx, siteId),
    ctx.db
      .query("searchEntries")
      .withIndex("by_site", (q) => q.eq("siteId", siteId))
      .collect(),
  ]);
  if (!site) return;

  const activeLibraryIds = Array.from(
    new Set(references.flatMap((reference) => reference.libraryIds)),
  ).sort();
  const referencedFileIds = Array.from(
    new Set(references.flatMap((reference) => reference.fileIds)),
  ).sort();
  const updatedAt = Date.now();
  const stateValue = {
    siteId,
    activeLibraryIds,
    referencedFileIds,
    updatedAt,
  };
  if (existingState) {
    await ctx.db.patch(existingState._id, stateValue);
  } else {
    await ctx.db.insert("publicationStates", stateValue);
  }

  const siteIsPublic = isPubliclyPublishedSite(site);
  const publicLibraries = new Set<string>(activeLibraryIds);
  const publicFiles = new Set<string>(referencedFileIds);
  for (const entry of searchEntries) {
    const isPublic =
      siteIsPublic &&
      (entry.kind === "page" ||
        (entry.fileMetadata?.libraryId
          ? publicLibraries.has(entry.fileMetadata.libraryId)
          : publicFiles.has(entry.sourceId)));
    const audience = isPublic ? "public" : "private";
    if (entry.audience !== audience) {
      await ctx.db.patch(entry._id, { audience, updatedAt });
    }
  }
}
