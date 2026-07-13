import type { GenericMutationCtx } from "convex/server";
import type { DataModel, Id } from "../_generated/dataModel";
import { requireOrganizationPermission } from "../permissions";

type MutationCtx = GenericMutationCtx<DataModel>;

export async function requireLibraryManagement(
  ctx: MutationCtx,
  libraryId: Id<"documentLibraries">,
) {
  const library = await ctx.db.get(libraryId);
  if (!library) throw new Error("Library not found");
  const site = await ctx.db.get(library.siteId);
  if (!site) throw new Error("Site not found");
  const access = await requireOrganizationPermission(ctx, site.organizationId, {
    resource: "library",
    action: "manage",
  });
  return { ...access, library, site };
}

export async function requireFolderManagement(
  ctx: MutationCtx,
  folderId: Id<"documentFolders">,
) {
  const folder = await ctx.db.get(folderId);
  if (!folder) throw new Error("Folder not found");
  const context = await requireLibraryManagement(ctx, folder.libraryId);
  return { ...context, folder };
}
