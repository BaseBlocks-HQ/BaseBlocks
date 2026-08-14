import type { GenericMutationCtx } from "convex/server";
import type { DataModel, Doc, Id } from "../_generated/dataModel";

type MutationCtx = Pick<GenericMutationCtx<DataModel>, "db">;

export type DraftEntityRef =
  | { entityType: "site"; entityId: Id<"sites"> }
  | { entityType: "page"; entityId: Id<"pages"> }
  | { entityType: "library"; entityId: Id<"documentLibraries"> }
  | { entityType: "folder"; entityId: Id<"documentFolders"> }
  | { entityType: "file"; entityId: Id<"files"> };

type DraftChangeValue = Omit<
  Doc<"draftChanges">,
  "_id" | "_creationTime" | "draftRevision"
>;

function same(a: unknown, b: unknown) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function changedDetails(
  fields: Array<{
    detail: string;
    current: unknown;
    released: unknown;
    movement?: boolean;
  }>,
) {
  return fields.filter((field) => !same(field.current, field.released));
}

async function resolveChange(
  ctx: MutationCtx,
  site: Doc<"sites">,
  ref: DraftEntityRef,
  updatedAt: number,
): Promise<DraftChangeValue | null> {
  const releaseId = site.draftBaseReleaseId;
  if (ref.entityType === "site") {
    const release = releaseId ? await ctx.db.get(releaseId) : null;
    const fields = changedDetails([
      { detail: "Name changed", current: site.name, released: release?.name },
      {
        detail: "Logo changed",
        current: site.logoFileId,
        released: release?.logoFileId,
      },
      {
        detail: "Favicon changed",
        current: site.faviconFileId,
        released: release?.faviconFileId,
      },
      {
        detail: "Default page changed",
        current: site.defaultPageId,
        released: release?.defaultPageId,
      },
      {
        detail: "Settings changed",
        current: site.settings,
        released: release?.settings,
      },
    ]);
    if (release && fields.length === 0) return null;
    return {
      siteId: site._id,
      entityType: "site",
      entityId: site._id,
      changeType: release ? "updated" : "added",
      label: "Site settings",
      details: release ? fields.map((field) => field.detail) : ["Initial site"],
      updatedAt,
    };
  }

  if (ref.entityType === "page") {
    const [current, document, released] = await Promise.all([
      ctx.db.get(ref.entityId),
      ctx.db
        .query("pageDocuments")
        .withIndex("by_page", (q) => q.eq("pageId", ref.entityId))
        .unique(),
      releaseId
        ? ctx.db
            .query("releasePages")
            .withIndex("by_release_page", (q) =>
              q.eq("releaseId", releaseId).eq("pageId", ref.entityId),
            )
            .unique()
        : null,
    ]);
    const active = current?.deletedAt === undefined ? current : null;
    if (!active && !released) return null;
    if (!released && active) {
      return {
        siteId: site._id,
        entityType: "page",
        entityId: ref.entityId,
        changeType: "added",
        label: active.title,
        details: ["Added"],
        updatedAt,
      };
    }
    if (!active && released) {
      return {
        siteId: site._id,
        entityType: "page",
        entityId: ref.entityId,
        changeType: "deleted",
        label: released.title,
        details: ["Deleted"],
        updatedAt,
      };
    }
    if (!active || !released) return null;
    const fields = changedDetails([
      {
        detail: "Title changed",
        current: active.title,
        released: released.title,
      },
      { detail: "URL changed", current: active.slug, released: released.slug },
      { detail: "Icon changed", current: active.icon, released: released.icon },
      {
        detail: "Moved",
        current: active.parentId,
        released: released.parentId,
        movement: true,
      },
      {
        detail: "Reordered",
        current: active.order,
        released: released.order,
        movement: true,
      },
      {
        detail: "Content edited",
        current: document?.contentHash,
        released: released.contentHash,
      },
    ]);
    if (fields.length === 0) return null;
    return {
      siteId: site._id,
      entityType: "page",
      entityId: ref.entityId,
      changeType: fields.every((field) => field.movement) ? "moved" : "updated",
      label: active.title,
      details: fields.map((field) => field.detail),
      updatedAt,
    };
  }

  if (ref.entityType === "library") {
    const [current, released] = await Promise.all([
      ctx.db.get(ref.entityId),
      releaseId
        ? ctx.db
            .query("releaseLibraries")
            .withIndex("by_release_library", (q) =>
              q.eq("releaseId", releaseId).eq("libraryId", ref.entityId),
            )
            .unique()
        : null,
    ]);
    const active = current?.deletedAt === undefined ? current : null;
    if (!active && !released) return null;
    if (!released && active)
      return {
        siteId: site._id,
        entityType: "library",
        entityId: ref.entityId,
        changeType: "added",
        label: active.name,
        details: ["Added"],
        updatedAt,
      };
    if (!active && released)
      return {
        siteId: site._id,
        entityType: "library",
        entityId: ref.entityId,
        changeType: "deleted",
        label: released.name,
        details: ["Deleted"],
        updatedAt,
      };
    if (!active || !released || active.name === released.name) return null;
    return {
      siteId: site._id,
      entityType: "library",
      entityId: ref.entityId,
      changeType: "updated",
      label: active.name,
      details: ["Name changed"],
      updatedAt,
    };
  }

  if (ref.entityType === "folder") {
    const [current, released] = await Promise.all([
      ctx.db.get(ref.entityId),
      releaseId
        ? ctx.db
            .query("releaseFolders")
            .withIndex("by_release_folder", (q) =>
              q.eq("releaseId", releaseId).eq("folderId", ref.entityId),
            )
            .unique()
        : null,
    ]);
    const active = current?.deletedAt === undefined ? current : null;
    if (!active && !released) return null;
    if (!released && active)
      return {
        siteId: site._id,
        entityType: "folder",
        entityId: ref.entityId,
        changeType: "added",
        label: active.name,
        details: ["Added"],
        updatedAt,
      };
    if (!active && released)
      return {
        siteId: site._id,
        entityType: "folder",
        entityId: ref.entityId,
        changeType: "deleted",
        label: released.name,
        details: ["Deleted"],
        updatedAt,
      };
    if (!active || !released) return null;
    const fields = changedDetails([
      { detail: "Name changed", current: active.name, released: released.name },
      {
        detail: "Moved",
        current: active.parentId,
        released: released.parentId,
        movement: true,
      },
      {
        detail: "Reordered",
        current: active.order,
        released: released.order,
        movement: true,
      },
    ]);
    if (fields.length === 0) return null;
    return {
      siteId: site._id,
      entityType: "folder",
      entityId: ref.entityId,
      changeType: fields.every((field) => field.movement) ? "moved" : "updated",
      label: active.name,
      details: fields.map((field) => field.detail),
      updatedAt,
    };
  }

  const [current, released] = await Promise.all([
    ctx.db.get(ref.entityId),
    releaseId
      ? ctx.db
          .query("releaseFiles")
          .withIndex("by_release_file", (q) =>
            q.eq("releaseId", releaseId).eq("fileId", ref.entityId),
          )
          .unique()
      : null,
  ]);
  const active = current?.deletedAt === undefined ? current : null;
  if (!active && !released) return null;
  if (!released && active)
    return {
      siteId: site._id,
      entityType: "file",
      entityId: ref.entityId,
      changeType: "added",
      label: active.filename,
      details: ["Added"],
      updatedAt,
    };
  if (!active && released)
    return {
      siteId: site._id,
      entityType: "file",
      entityId: ref.entityId,
      changeType: "deleted",
      label: released.filename,
      details: ["Deleted"],
      updatedAt,
    };
  if (!active || !released) return null;
  const fields = changedDetails([
    {
      detail: "Name changed",
      current: active.filename,
      released: released.filename,
    },
    {
      detail: "Moved",
      current: active.folderId,
      released: released.folderId,
      movement: true,
    },
    {
      detail: "Reordered",
      current: active.order,
      released: released.order,
      movement: true,
    },
    {
      detail: "File replaced",
      current: active.objectKey,
      released: released.objectKey,
    },
  ]);
  if (fields.length === 0) return null;
  return {
    siteId: site._id,
    entityType: "file",
    entityId: ref.entityId,
    changeType: fields.every((field) => field.movement) ? "moved" : "updated",
    label: active.filename,
    details: fields.map((field) => field.detail),
    updatedAt,
  };
}

export async function reconcileDraftChanges(
  ctx: MutationCtx,
  site: Doc<"sites">,
  refs: DraftEntityRef[],
  updatedAt = Date.now(),
  draftRevision = site.draftRevision,
) {
  const unique = new Map(
    refs.map((ref) => [`${ref.entityType}:${ref.entityId}`, ref]),
  );
  for (const ref of unique.values()) {
    const existing = await ctx.db
      .query("draftChanges")
      .withIndex("by_site_entity", (q) =>
        q
          .eq("siteId", site._id)
          .eq("entityType", ref.entityType)
          .eq("entityId", ref.entityId),
      )
      .unique();
    const resolved = await resolveChange(ctx, site, ref, updatedAt);
    const change = resolved ? { ...resolved, draftRevision } : null;
    if (!change) {
      if (existing) await ctx.db.delete(existing._id);
    } else if (existing) {
      await ctx.db.replace(existing._id, change);
    } else {
      await ctx.db.insert("draftChanges", change);
    }
  }
}

export async function clearDraftChanges(ctx: MutationCtx, siteId: Id<"sites">) {
  const changes = await ctx.db
    .query("draftChanges")
    .withIndex("by_site", (q) => q.eq("siteId", siteId))
    .collect();
  for (const change of changes) await ctx.db.delete(change._id);
}
