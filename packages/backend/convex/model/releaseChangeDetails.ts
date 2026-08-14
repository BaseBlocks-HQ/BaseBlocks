import type { GenericQueryCtx } from "convex/server";
import type { DataModel, Doc, Id } from "../_generated/dataModel";
import { changedField, openEditorContentLines } from "./releaseDiff";

type ReadCtx = Pick<GenericQueryCtx<DataModel>, "db">;
type Summary = Pick<
  Doc<"draftChanges">,
  "entityType" | "entityId" | "changeType" | "label" | "details"
>;

function compact<T>(values: Array<T | null>): T[] {
  return values.filter((value): value is T => value !== null);
}

function id<T extends keyof DataModel>(ctx: ReadCtx, table: T, value: string) {
  return ctx.db.normalizeId(table, value);
}

async function revisionContent(
  ctx: ReadCtx,
  revisionId: Id<"contentRevisions"> | undefined,
) {
  if (!revisionId) return undefined;
  const revision = await ctx.db.get(revisionId);
  const payload = revision ? await ctx.db.get(revision.payloadId) : null;
  return payload?.content;
}

export async function buildReleaseChangeDetail(
  ctx: ReadCtx,
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
        changedField("Favicon", base?.faviconFileId, site.faviconFileId),
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

export async function buildHistoricalReleaseContent(
  ctx: ReadCtx,
  release: Doc<"siteReleases">,
  change: Summary,
) {
  if (change.entityType !== "page") return undefined;
  const pageId = id(ctx, "pages", change.entityId);
  if (!pageId) return undefined;
  const previousReleaseId = release.previousReleaseId;
  const [current, previous] = await Promise.all([
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
  ]);
  if (current?.contentHash === previous?.contentHash) return undefined;
  const [before, after] = await Promise.all([
    revisionContent(ctx, previous?.contentRevisionId),
    revisionContent(ctx, current?.contentRevisionId),
  ]);
  return {
    beforeLines: openEditorContentLines(before),
    afterLines: openEditorContentLines(after),
  };
}
