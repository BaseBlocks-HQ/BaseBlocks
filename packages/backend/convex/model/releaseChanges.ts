import type { GenericMutationCtx, GenericQueryCtx } from "convex/server";
import type { DataModel, Doc, Id } from "../_generated/dataModel";

type ReadCtx = Pick<
  GenericQueryCtx<DataModel> | GenericMutationCtx<DataModel>,
  "db"
>;

export type ReleaseChange = {
  entityType: "site" | "page" | "library" | "folder" | "file";
  entityId: string;
  changeType: "added" | "updated" | "deleted" | "moved";
  label: string;
  details: string[];
};

function same(valueA: unknown, valueB: unknown) {
  return JSON.stringify(valueA) === JSON.stringify(valueB);
}

export function diffReleaseEntities<
  TCurrent extends { _id: string },
  TReleased,
>(options: {
  entityType: ReleaseChange["entityType"];
  current: TCurrent[];
  released: TReleased[];
  releasedId: (value: TReleased) => string;
  label: (value: TCurrent | TReleased) => string;
  fields: Array<{
    name: string;
    current: (value: TCurrent) => unknown;
    released: (value: TReleased) => unknown;
    movement?: boolean;
  }>;
}): ReleaseChange[] {
  const changes: ReleaseChange[] = [];
  const currentById = new Map(
    options.current.map((value) => [value._id, value]),
  );
  const releasedById = new Map(
    options.released.map((value) => [options.releasedId(value), value]),
  );

  for (const value of options.current) {
    const previous = releasedById.get(value._id);
    if (!previous) {
      changes.push({
        entityType: options.entityType,
        entityId: value._id,
        changeType: "added",
        label: options.label(value),
        details: ["Added"],
      });
      continue;
    }
    const changedFields = options.fields.filter(
      (field) => !same(field.current(value), field.released(previous)),
    );
    if (changedFields.length === 0) continue;
    changes.push({
      entityType: options.entityType,
      entityId: value._id,
      changeType: changedFields.every((field) => field.movement)
        ? "moved"
        : "updated",
      label: options.label(value),
      details: changedFields.map((field) => field.name),
    });
  }

  for (const value of options.released) {
    const id = options.releasedId(value);
    if (currentById.has(id)) continue;
    changes.push({
      entityType: options.entityType,
      entityId: id,
      changeType: "deleted",
      label: options.label(value),
      details: ["Deleted"],
    });
  }
  return changes;
}

export async function collectReleaseChanges(
  ctx: ReadCtx,
  site: Doc<"sites">,
  baseReleaseId: Id<"siteReleases"> | undefined,
): Promise<ReleaseChange[]> {
  const [
    pages,
    pageDocuments,
    libraries,
    folders,
    files,
    baseRelease,
    releasePages,
    releaseLibraries,
    releaseFolders,
    releaseFiles,
  ] = await Promise.all([
    ctx.db
      .query("pages")
      .withIndex("by_site", (q) => q.eq("siteId", site._id))
      .collect(),
    ctx.db
      .query("pageDocuments")
      .withIndex("by_site", (q) => q.eq("siteId", site._id))
      .collect(),
    ctx.db
      .query("documentLibraries")
      .withIndex("by_site", (q) => q.eq("siteId", site._id))
      .collect(),
    ctx.db.query("documentFolders").collect(),
    ctx.db
      .query("files")
      .withIndex("by_site", (q) => q.eq("siteId", site._id))
      .collect(),
    baseReleaseId ? ctx.db.get(baseReleaseId) : null,
    baseReleaseId
      ? ctx.db
          .query("releasePages")
          .withIndex("by_release", (q) => q.eq("releaseId", baseReleaseId))
          .collect()
      : [],
    baseReleaseId
      ? ctx.db
          .query("releaseLibraries")
          .withIndex("by_release", (q) => q.eq("releaseId", baseReleaseId))
          .collect()
      : [],
    baseReleaseId
      ? ctx.db
          .query("releaseFolders")
          .withIndex("by_release", (q) => q.eq("releaseId", baseReleaseId))
          .collect()
      : [],
    baseReleaseId
      ? ctx.db
          .query("releaseFiles")
          .withIndex("by_release", (q) => q.eq("releaseId", baseReleaseId))
          .collect()
      : [],
  ]);

  const activePages = pages.filter((value) => value.deletedAt === undefined);
  const activeLibraries = libraries.filter(
    (value) => value.deletedAt === undefined,
  );
  const activeLibraryIds = new Set(activeLibraries.map((value) => value._id));
  const activeFolders = folders.filter(
    (value) =>
      value.deletedAt === undefined && activeLibraryIds.has(value.libraryId),
  );
  const activeFiles = files.filter((value) => value.deletedAt === undefined);
  const documentByPageId = new Map(
    pageDocuments.map((value) => [value.pageId, value]),
  );
  const changes: ReleaseChange[] = [];

  if (
    !baseRelease ||
    !same(
      {
        name: site.name,
        logoFileId: site.logoFileId,
        defaultPageId: site.defaultPageId,
        settings: site.settings,
      },
      {
        name: baseRelease.name,
        logoFileId: baseRelease.logoFileId,
        defaultPageId: baseRelease.defaultPageId,
        settings: baseRelease.settings,
      },
    )
  ) {
    changes.push({
      entityType: "site",
      entityId: site._id,
      changeType: baseRelease ? "updated" : "added",
      label: "Site settings",
      details: baseRelease ? ["Settings changed"] : ["Initial site"],
    });
  }

  changes.push(
    ...diffReleaseEntities({
      entityType: "page",
      current: activePages,
      released: releasePages,
      releasedId: (value) => value.pageId,
      label: (value) => value.title,
      fields: [
        {
          name: "Title changed",
          current: (v) => v.title,
          released: (v) => v.title,
        },
        {
          name: "URL changed",
          current: (v) => v.slug,
          released: (v) => v.slug,
        },
        {
          name: "Icon changed",
          current: (v) => v.icon,
          released: (v) => v.icon,
        },
        {
          name: "Moved",
          current: (v) => v.parentId,
          released: (v) => v.parentId,
          movement: true,
        },
        {
          name: "Reordered",
          current: (v) => v.order,
          released: (v) => v.order,
          movement: true,
        },
        {
          name: "Content edited",
          current: (v) => documentByPageId.get(v._id)?.contentHash,
          released: (v) => v.contentHash,
        },
      ],
    }),
  );

  changes.push(
    ...diffReleaseEntities({
      entityType: "library",
      current: activeLibraries,
      released: releaseLibraries,
      releasedId: (value) => value.libraryId,
      label: (value) => value.name,
      fields: [
        {
          name: "Name changed",
          current: (v) => v.name,
          released: (v) => v.name,
        },
      ],
    }),
  );

  changes.push(
    ...diffReleaseEntities({
      entityType: "folder",
      current: activeFolders,
      released: releaseFolders,
      releasedId: (value) => value.folderId,
      label: (value) => value.name,
      fields: [
        {
          name: "Name changed",
          current: (v) => v.name,
          released: (v) => v.name,
        },
        {
          name: "Moved",
          current: (v) => v.parentId,
          released: (v) => v.parentId,
          movement: true,
        },
        {
          name: "Reordered",
          current: (v) => v.order,
          released: (v) => v.order,
          movement: true,
        },
      ],
    }),
  );

  changes.push(
    ...diffReleaseEntities({
      entityType: "file",
      current: activeFiles,
      released: releaseFiles,
      releasedId: (value) => value.fileId,
      label: (value) => value.filename,
      fields: [
        {
          name: "Name changed",
          current: (v) => v.filename,
          released: (v) => v.filename,
        },
        {
          name: "Moved",
          current: (v) => v.folderId,
          released: (v) => v.folderId,
          movement: true,
        },
        {
          name: "Reordered",
          current: (v) => v.order,
          released: (v) => v.order,
          movement: true,
        },
        {
          name: "File replaced",
          current: (v) => v.objectKey,
          released: (v) => v.objectKey,
        },
      ],
    }),
  );

  return changes;
}
