import type { GenericMutationCtx } from "convex/server";
import type { DataModel, Doc, Id } from "../_generated/dataModel";
import { changedField, openEditorContentLines } from "./releaseDiff";

type MutationCtx = Pick<GenericMutationCtx<DataModel>, "db">;
type Summary = Pick<
  Doc<"draftChanges">,
  "entityType" | "entityId" | "changeType" | "label" | "details"
>;

function compact<T>(values: Array<T | null>): T[] {
  return values.filter((value): value is T => value !== null);
}

function id<T extends keyof DataModel>(
  ctx: MutationCtx,
  table: T,
  value: string,
) {
  return ctx.db.normalizeId(table, value);
}

async function revisionContent(
  ctx: MutationCtx,
  revisionId: Id<"contentRevisions"> | undefined,
) {
  if (!revisionId) return undefined;
  const revision = await ctx.db.get(revisionId);
  const payload = revision ? await ctx.db.get(revision.payloadId) : null;
  return payload?.content;
}

export async function buildReleaseChangeDetail(
  ctx: MutationCtx,
  site: Doc<"sites">,
  change: Summary,
) {
  const baseReleaseId = site.draftBaseReleaseId;
  if (change.entityType === "site") {
    const base = baseReleaseId ? await ctx.db.get(baseReleaseId) : null;
    return {
      fields: compact([
        changedField("Site name", base?.name, site.name),
        changedField("Logo", base?.logoFileId, site.logoFileId),
        changedField("Default page", base?.defaultPageId, site.defaultPageId),
        changedField("Settings", base?.settings, site.settings),
      ]),
    };
  }
  if (change.entityType === "page") {
    const pageId = id(ctx, "pages", change.entityId);
    const [current, currentDocument, base] = pageId
      ? await Promise.all([
          ctx.db.get(pageId),
          ctx.db
            .query("pageDocuments")
            .withIndex("by_page", (q) => q.eq("pageId", pageId))
            .unique(),
          baseReleaseId
            ? ctx.db
                .query("releasePages")
                .withIndex("by_release_page", (q) =>
                  q.eq("releaseId", baseReleaseId).eq("pageId", pageId),
                )
                .unique()
            : null,
        ])
      : [null, null, null];
    const active = current?.deletedAt === undefined ? current : null;
    const [before, after] = await Promise.all([
      revisionContent(ctx, base?.contentRevisionId),
      revisionContent(ctx, active ? currentDocument?.revisionId : undefined),
    ]);
    const contentChanged = currentDocument?.contentHash !== base?.contentHash;
    return {
      fields: compact([
        changedField("Title", base?.title, active?.title),
        changedField("URL", base?.slug, active?.slug),
        changedField("Parent", base?.parentId, active?.parentId),
        changedField("Icon", base?.icon, active?.icon),
        changedField("Position", base?.order, active?.order),
      ]),
      content: contentChanged
        ? {
            beforeLines: openEditorContentLines(before),
            afterLines: openEditorContentLines(after),
          }
        : undefined,
    };
  }
  if (change.entityType === "library") {
    const entityId = id(ctx, "documentLibraries", change.entityId);
    const [current, base] = entityId
      ? await Promise.all([
          ctx.db.get(entityId),
          baseReleaseId
            ? ctx.db
                .query("releaseLibraries")
                .withIndex("by_release_library", (q) =>
                  q.eq("releaseId", baseReleaseId).eq("libraryId", entityId),
                )
                .unique()
            : null,
        ])
      : [null, null];
    return {
      fields: compact([
        changedField(
          "Name",
          base?.name,
          current?.deletedAt === undefined ? current?.name : undefined,
        ),
      ]),
    };
  }
  if (change.entityType === "folder") {
    const entityId = id(ctx, "documentFolders", change.entityId);
    const [current, base] = entityId
      ? await Promise.all([
          ctx.db.get(entityId),
          baseReleaseId
            ? ctx.db
                .query("releaseFolders")
                .withIndex("by_release_folder", (q) =>
                  q.eq("releaseId", baseReleaseId).eq("folderId", entityId),
                )
                .unique()
            : null,
        ])
      : [null, null];
    const active = current?.deletedAt === undefined ? current : null;
    return {
      fields: compact([
        changedField("Name", base?.name, active?.name),
        changedField("Parent folder", base?.parentId, active?.parentId),
        changedField("Position", base?.order, active?.order),
      ]),
    };
  }
  const entityId = id(ctx, "files", change.entityId);
  const [current, base] = entityId
    ? await Promise.all([
        ctx.db.get(entityId),
        baseReleaseId
          ? ctx.db
              .query("releaseFiles")
              .withIndex("by_release_file", (q) =>
                q.eq("releaseId", baseReleaseId).eq("fileId", entityId),
              )
              .unique()
          : null,
      ])
    : [null, null];
  const active = current?.deletedAt === undefined ? current : null;
  return {
    fields: compact([
      changedField("Name", base?.filename, active?.filename),
      changedField("Folder", base?.folderId, active?.folderId),
      changedField("Type", base?.contentType, active?.contentType),
      changedField("Size", base?.size, active?.size),
      changedField("File content", base?.checksum, active?.checksum),
    ]),
  };
}

export async function buildHistoricalReleaseChangeDetail(
  ctx: MutationCtx,
  release: Doc<"siteReleases">,
  change: Summary,
) {
  const previousReleaseId = release.previousReleaseId;
  if (change.entityType === "site") {
    const previous = previousReleaseId
      ? await ctx.db.get(previousReleaseId)
      : null;
    return {
      fields: compact([
        changedField("Site name", previous?.name, release.name),
        changedField("Logo", previous?.logoFileId, release.logoFileId),
        changedField(
          "Default page",
          previous?.defaultPageId,
          release.defaultPageId,
        ),
        changedField("Settings", previous?.settings, release.settings),
      ]),
    };
  }
  if (change.entityType === "page") {
    const pageId = id(ctx, "pages", change.entityId);
    const [current, previous] = pageId
      ? await Promise.all([
          ctx.db
            .query("releasePages")
            .withIndex("by_release_page", (q) =>
              q.eq("releaseId", release._id).eq("pageId", pageId),
            )
            .unique(),
          previousReleaseId
            ? ctx.db
                .query("releasePages")
                .withIndex("by_release_page", (q) =>
                  q.eq("releaseId", previousReleaseId).eq("pageId", pageId),
                )
                .unique()
            : null,
        ])
      : [null, null];
    const [before, after] = await Promise.all([
      revisionContent(ctx, previous?.contentRevisionId),
      revisionContent(ctx, current?.contentRevisionId),
    ]);
    const contentChanged = current?.contentHash !== previous?.contentHash;
    return {
      fields: compact([
        changedField("Title", previous?.title, current?.title),
        changedField("URL", previous?.slug, current?.slug),
        changedField("Parent", previous?.parentId, current?.parentId),
        changedField("Icon", previous?.icon, current?.icon),
        changedField("Position", previous?.order, current?.order),
      ]),
      content: contentChanged
        ? {
            beforeLines: openEditorContentLines(before),
            afterLines: openEditorContentLines(after),
          }
        : undefined,
    };
  }
  if (change.entityType === "library") {
    const entityId = id(ctx, "documentLibraries", change.entityId);
    const [current, previous] = entityId
      ? await Promise.all([
          ctx.db
            .query("releaseLibraries")
            .withIndex("by_release_library", (q) =>
              q.eq("releaseId", release._id).eq("libraryId", entityId),
            )
            .unique(),
          previousReleaseId
            ? ctx.db
                .query("releaseLibraries")
                .withIndex("by_release_library", (q) =>
                  q
                    .eq("releaseId", previousReleaseId)
                    .eq("libraryId", entityId),
                )
                .unique()
            : null,
        ])
      : [null, null];
    return {
      fields: compact([changedField("Name", previous?.name, current?.name)]),
    };
  }
  if (change.entityType === "folder") {
    const entityId = id(ctx, "documentFolders", change.entityId);
    const [current, previous] = entityId
      ? await Promise.all([
          ctx.db
            .query("releaseFolders")
            .withIndex("by_release_folder", (q) =>
              q.eq("releaseId", release._id).eq("folderId", entityId),
            )
            .unique(),
          previousReleaseId
            ? ctx.db
                .query("releaseFolders")
                .withIndex("by_release_folder", (q) =>
                  q.eq("releaseId", previousReleaseId).eq("folderId", entityId),
                )
                .unique()
            : null,
        ])
      : [null, null];
    return {
      fields: compact([
        changedField("Name", previous?.name, current?.name),
        changedField("Parent folder", previous?.parentId, current?.parentId),
        changedField("Position", previous?.order, current?.order),
      ]),
    };
  }
  const entityId = id(ctx, "files", change.entityId);
  const [current, previous] = entityId
    ? await Promise.all([
        ctx.db
          .query("releaseFiles")
          .withIndex("by_release_file", (q) =>
            q.eq("releaseId", release._id).eq("fileId", entityId),
          )
          .unique(),
        previousReleaseId
          ? ctx.db
              .query("releaseFiles")
              .withIndex("by_release_file", (q) =>
                q.eq("releaseId", previousReleaseId).eq("fileId", entityId),
              )
              .unique()
          : null,
      ])
    : [null, null];
  return {
    fields: compact([
      changedField("Name", previous?.filename, current?.filename),
      changedField("Folder", previous?.folderId, current?.folderId),
      changedField("Type", previous?.contentType, current?.contentType),
      changedField("Size", previous?.size, current?.size),
      changedField("File content", previous?.checksum, current?.checksum),
    ]),
  };
}
