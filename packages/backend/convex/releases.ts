import { ConvexError, v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { buildFileUrl } from "./files";
import { clearDraftChanges } from "./model/draftChanges";
import { synchronizeParentDocument } from "./model/pageHierarchy";
import { buildReleaseChangeDetail } from "./model/releaseChangeDetails";
import { publicationActionForTarget } from "./model/releaseState";
import {
  extractOpenEditorText,
  parseOpenEditorDocument,
} from "./pageContentFormat";
import {
  isOrganizationMember,
  requireOrganizationPermission,
} from "./permissions";

async function requireSiteForMember(
  ctx: Parameters<typeof isOrganizationMember>[0],
  siteId: Id<"sites">,
) {
  const site = await ctx.db.get(siteId);
  if (!site || !(await isOrganizationMember(ctx, site.organizationId))) {
    return null;
  }
  return site;
}

export const getDraftSummary = query({
  args: { siteId: v.id("sites") },
  returns: v.any(),
  handler: async (ctx, { siteId }) => {
    const site = await requireSiteForMember(ctx, siteId);
    if (!site) return null;
    const liveRelease = site.liveReleaseId
      ? await ctx.db.get(site.liveReleaseId)
      : null;
    return {
      draftRevision: site.draftRevision ?? 0,
      liveRelease,
      nextReleaseNumber: site.nextReleaseNumber ?? 1,
      hasUnpublishedChanges:
        (await ctx.db
          .query("draftChanges")
          .withIndex("by_site", (q) => q.eq("siteId", siteId))
          .first()) !== null || site.draftBaseReleaseId !== site.liveReleaseId,
    };
  },
});

export const getDraftChanges = query({
  args: { siteId: v.id("sites") },
  returns: v.any(),
  handler: async (ctx, { siteId }) => {
    const site = await requireSiteForMember(ctx, siteId);
    if (!site) return null;
    const changes = await ctx.db
      .query("draftChanges")
      .withIndex("by_site", (q) => q.eq("siteId", siteId))
      .collect();
    if (
      changes.length === 0 &&
      site.draftBaseReleaseId !== site.liveReleaseId
    ) {
      return [
        {
          entityType: "site",
          entityId: siteId,
          changeType: "updated",
          label: "Published version",
          details: ["Draft and live version differ"],
        },
      ];
    }
    return changes;
  },
});

export const list = query({
  args: { siteId: v.id("sites") },
  returns: v.any(),
  handler: async (ctx, { siteId }) => {
    const site = await requireSiteForMember(ctx, siteId);
    if (!site) return [];
    const releases = await ctx.db
      .query("siteReleases")
      .withIndex("by_site", (q) => q.eq("siteId", siteId))
      .order("desc")
      .collect();
    return releases.map((release) => ({
      ...release,
      isLive: release._id === site.liveReleaseId,
    }));
  },
});

export const get = query({
  args: { releaseId: v.id("siteReleases") },
  returns: v.any(),
  handler: async (ctx, { releaseId }) => {
    const release = await ctx.db.get(releaseId);
    if (!release) return null;
    const site = await requireSiteForMember(ctx, release.siteId);
    if (!site) return null;
    const changes = await ctx.db
      .query("releaseChanges")
      .withIndex("by_release", (q) => q.eq("releaseId", releaseId))
      .collect();
    return {
      release: { ...release, isLive: site.liveReleaseId === releaseId },
      changes: changes.map((change) => ({
        entityType: change.entityType,
        entityId: change.entityId,
        changeType: change.changeType,
        label: change.label,
        fields: change.fields,
        content: change.content,
      })),
    };
  },
});

export const publish = mutation({
  args: {
    siteId: v.id("sites"),
    expectedDraftRevision: v.number(),
  },
  returns: v.object({
    releaseId: v.id("siteReleases"),
    number: v.number(),
    reused: v.boolean(),
  }),
  handler: async (ctx, { siteId, expectedDraftRevision }) => {
    const site = await ctx.db.get(siteId);
    if (!site) throw new ConvexError("Site not found");
    const { auth } = await requireOrganizationPermission(
      ctx,
      site.organizationId,
      { resource: "publication", action: "publish" },
    );
    const draftRevision = site.draftRevision ?? 0;
    if (draftRevision !== expectedDraftRevision) {
      throw new ConvexError(
        "The draft changed while publishing. Review the latest changes and try again.",
      );
    }

    const matchingRelease = site.draftBaseReleaseId
      ? await ctx.db.get(site.draftBaseReleaseId)
      : null;
    const pendingChange = await ctx.db
      .query("draftChanges")
      .withIndex("by_site", (q) => q.eq("siteId", siteId))
      .first();
    if (matchingRelease && !pendingChange) {
      if (site.liveReleaseId === matchingRelease._id) {
        throw new ConvexError("This draft is already live");
      }
      const currentRelease = site.liveReleaseId
        ? await ctx.db.get(site.liveReleaseId)
        : null;
      const now = Date.now();
      await ctx.db.patch(siteId, {
        liveReleaseId: matchingRelease._id,
        updatedAt: now,
      });
      await ctx.db.insert("publicationEvents", {
        siteId,
        action: publicationActionForTarget(
          currentRelease?.number,
          matchingRelease.number,
        ),
        fromReleaseId: site.liveReleaseId,
        toReleaseId: matchingRelease._id,
        actorId: auth.userId,
        createdAt: now,
      });
      return {
        releaseId: matchingRelease._id,
        number: matchingRelease.number,
        reused: true,
      };
    }

    const [allPages, documents, allLibraries, allFolders, allFiles] =
      await Promise.all([
        ctx.db
          .query("pages")
          .withIndex("by_site", (q) => q.eq("siteId", siteId))
          .collect(),
        ctx.db
          .query("pageDocuments")
          .withIndex("by_site", (q) => q.eq("siteId", siteId))
          .collect(),
        ctx.db
          .query("documentLibraries")
          .withIndex("by_site", (q) => q.eq("siteId", siteId))
          .collect(),
        ctx.db
          .query("documentFolders")
          .withIndex("by_site", (q) => q.eq("siteId", siteId))
          .collect(),
        ctx.db
          .query("files")
          .withIndex("by_site", (q) => q.eq("siteId", siteId))
          .collect(),
      ]);
    const pages = allPages.filter((value) => value.deletedAt === undefined);
    if (pages.length === 0) {
      throw new ConvexError("A site must contain at least one page");
    }
    if (
      site.defaultPageId &&
      !pages.some((page) => page._id === site.defaultPageId)
    ) {
      throw new ConvexError("The default page is missing from the draft");
    }
    const documentByPageId = new Map(
      documents.map((value) => [value.pageId, value]),
    );
    const libraries = allLibraries.filter(
      (value) => value.deletedAt === undefined,
    );
    const libraryIds = new Set(libraries.map((value) => value._id));
    const folders = allFolders.filter(
      (value) =>
        value.deletedAt === undefined && libraryIds.has(value.libraryId),
    );
    const files = allFiles.filter((value) => value.deletedAt === undefined);
    const changes = await ctx.db
      .query("draftChanges")
      .withIndex("by_site", (q) => q.eq("siteId", siteId))
      .collect();
    if (site.liveReleaseId && changes.length === 0) {
      throw new ConvexError("There are no unpublished changes");
    }

    const now = Date.now();
    const number = site.nextReleaseNumber ?? 1;
    const releaseId = await ctx.db.insert("siteReleases", {
      siteId,
      number,
      name: site.name,
      logoFileId: site.logoFileId,
      defaultPageId: site.defaultPageId,
      settings: site.settings,
      sourceDraftRevision: draftRevision,
      previousReleaseId: site.draftBaseReleaseId,
      createdBy: auth.userId,
      createdAt: now,
      pageCount: pages.length,
      changeCount: changes.length,
    });

    for (const page of pages) {
      const document = documentByPageId.get(page._id);
      await ctx.db.insert("releasePages", {
        releaseId,
        siteId,
        pageId: page._id,
        parentId: page.parentId,
        title: page.title,
        slug: page.slug,
        icon: page.icon,
        order: page.order,
        contentRevisionId: document?.revisionId,
        contentHash: document?.contentHash,
        updatedAt: Math.max(page.updatedAt, document?.updatedAt ?? 0),
      });
      const revision = document?.revisionId
        ? await ctx.db.get(document.revisionId)
        : null;
      const payload = revision ? await ctx.db.get(revision.payloadId) : null;
      const text = payload
        ? extractOpenEditorText(parseOpenEditorDocument(payload.content))
        : "";
      await ctx.db.insert("releaseSearchEntries", {
        releaseId,
        siteId,
        kind: "page",
        sourceId: page._id,
        title: page.title,
        text: `${page.title} ${text}`.trim(),
      });
    }

    for (const library of libraries) {
      await ctx.db.insert("releaseLibraries", {
        releaseId,
        siteId,
        libraryId: library._id,
        name: library.name,
      });
    }
    for (const folder of folders) {
      await ctx.db.insert("releaseFolders", {
        releaseId,
        siteId,
        libraryId: folder.libraryId,
        folderId: folder._id,
        parentId: folder.parentId,
        name: folder.name,
        order: folder.order,
      });
    }
    for (const file of files) {
      await ctx.db.insert("releaseFiles", {
        releaseId,
        siteId,
        fileId: file._id,
        kind: file.kind,
        objectKey: file.objectKey,
        filename: file.filename,
        contentType: file.contentType,
        size: file.size,
        checksum: file.checksum,
        libraryId: file.libraryId,
        folderId: file.folderId,
        order: file.order,
        uploadedBy: file.uploadedBy,
        createdAt: file.createdAt,
      });
      if (file.kind === "file") {
        await ctx.db.insert("releaseSearchEntries", {
          releaseId,
          siteId,
          kind: "file",
          sourceId: file._id,
          title: file.filename,
          text: file.filename,
          fileMetadata: {
            fileId: file._id,
            filename: file.filename,
            fileContentType: file.contentType,
            size: file.size,
            libraryId: file.libraryId,
            downloadUrl: buildFileUrl(file._id),
          },
        });
      }
    }
    for (const change of changes) {
      const detail = await buildReleaseChangeDetail(ctx, site, change);
      await ctx.db.insert("releaseChanges", {
        releaseId,
        entityType: change.entityType,
        entityId: change.entityId,
        changeType: change.changeType,
        label: change.label,
        details: change.details,
        fields: detail.fields,
        content: detail.content,
      });
    }

    await ctx.db.patch(siteId, {
      liveReleaseId: releaseId,
      draftBaseReleaseId: releaseId,
      nextReleaseNumber: number + 1,
      updatedAt: now,
    });
    await clearDraftChanges(ctx, siteId);
    await ctx.db.insert("publicationEvents", {
      siteId,
      action: site.liveReleaseId ? "update" : "publish",
      fromReleaseId: site.liveReleaseId,
      toReleaseId: releaseId,
      actorId: auth.userId,
      createdAt: now,
    });
    return { releaseId, number, reused: false };
  },
});

export const makeLive = mutation({
  args: {
    releaseId: v.id("siteReleases"),
  },
  returns: v.null(),
  handler: async (ctx, { releaseId }) => {
    const release = await ctx.db.get(releaseId);
    if (!release) throw new ConvexError("Release not found");
    const site = await ctx.db.get(release.siteId);
    if (!site) throw new ConvexError("Site not found");
    const { auth } = await requireOrganizationPermission(
      ctx,
      site.organizationId,
      { resource: "publication", action: "publish" },
    );
    if (site.liveReleaseId === releaseId) return null;
    const currentRelease = site.liveReleaseId
      ? await ctx.db.get(site.liveReleaseId)
      : null;
    const action = publicationActionForTarget(
      currentRelease?.number,
      release.number,
    );
    const now = Date.now();
    await ctx.db.patch(site._id, {
      liveReleaseId: releaseId,
      updatedAt: now,
    });
    await ctx.db.insert("publicationEvents", {
      siteId: site._id,
      action,
      fromReleaseId: site.liveReleaseId,
      toReleaseId: releaseId,
      actorId: auth.userId,
      createdAt: now,
    });
    return null;
  },
});

export const unpublish = mutation({
  args: { siteId: v.id("sites") },
  returns: v.null(),
  handler: async (ctx, { siteId }) => {
    const site = await ctx.db.get(siteId);
    if (!site) throw new ConvexError("Site not found");
    const { auth } = await requireOrganizationPermission(
      ctx,
      site.organizationId,
      { resource: "publication", action: "publish" },
    );
    if (!site.liveReleaseId) return null;
    const now = Date.now();
    await ctx.db.patch(siteId, {
      liveReleaseId: undefined,
      updatedAt: now,
    });
    await ctx.db.insert("publicationEvents", {
      siteId,
      action: "unpublish",
      fromReleaseId: site.liveReleaseId,
      actorId: auth.userId,
      createdAt: now,
    });
    return null;
  },
});

function byId<T extends { _id: string }>(values: T[]) {
  return new Map(values.map((value) => [value._id, value]));
}

export const restoreToDraft = mutation({
  args: { releaseId: v.id("siteReleases") },
  returns: v.number(),
  handler: async (ctx, { releaseId }) => {
    const release = await ctx.db.get(releaseId);
    if (!release) throw new ConvexError("Release not found");
    const site = await ctx.db.get(release.siteId);
    if (!site) throw new ConvexError("Site not found");
    const { auth } = await requireOrganizationPermission(
      ctx,
      site.organizationId,
      { resource: "content", action: "edit" },
    );
    const [
      releasePages,
      releaseLibraries,
      releaseFolders,
      releaseFiles,
      pages,
      libraries,
      folders,
      files,
      pageDocuments,
    ] = await Promise.all([
      ctx.db
        .query("releasePages")
        .withIndex("by_release", (q) => q.eq("releaseId", releaseId))
        .collect(),
      ctx.db
        .query("releaseLibraries")
        .withIndex("by_release", (q) => q.eq("releaseId", releaseId))
        .collect(),
      ctx.db
        .query("releaseFolders")
        .withIndex("by_release", (q) => q.eq("releaseId", releaseId))
        .collect(),
      ctx.db
        .query("releaseFiles")
        .withIndex("by_release", (q) => q.eq("releaseId", releaseId))
        .collect(),
      ctx.db
        .query("pages")
        .withIndex("by_site", (q) => q.eq("siteId", site._id))
        .collect(),
      ctx.db
        .query("documentLibraries")
        .withIndex("by_site", (q) => q.eq("siteId", site._id))
        .collect(),
      ctx.db
        .query("documentFolders")
        .withIndex("by_site", (q) => q.eq("siteId", site._id))
        .collect(),
      ctx.db
        .query("files")
        .withIndex("by_site", (q) => q.eq("siteId", site._id))
        .collect(),
      ctx.db
        .query("pageDocuments")
        .withIndex("by_site", (q) => q.eq("siteId", site._id))
        .collect(),
    ]);
    const now = Date.now();
    const draftRevision = (site.draftRevision ?? 0) + 1;
    const releasedPageIds = new Set(releasePages.map((value) => value.pageId));
    const releasedLibraryIds = new Set(
      releaseLibraries.map((value) => value.libraryId),
    );
    const releasedFolderIds = new Set(
      releaseFolders.map((value) => value.folderId),
    );
    const releasedFileIds = new Set(releaseFiles.map((value) => value.fileId));
    const pageById = byId(pages);
    const libraryById = byId(libraries);
    const folderById = byId(folders);
    const fileById = byId(files);
    const documentByPageId = new Map(
      pageDocuments.map((value) => [value.pageId, value]),
    );
    const parentsToSynchronize = new Set<Id<"pages">>();
    for (const page of pages) {
      if (page.parentId) parentsToSynchronize.add(page.parentId);
    }
    for (const page of releasePages) {
      if (page.parentId) parentsToSynchronize.add(page.parentId);
    }

    for (const page of pages) {
      if (!releasedPageIds.has(page._id) && page.deletedAt === undefined) {
        await ctx.db.patch(page._id, { deletedAt: now, updatedAt: now });
      }
    }
    for (const snapshot of releasePages) {
      const page = pageById.get(snapshot.pageId);
      if (!page) {
        throw new ConvexError(
          "This historical page identity is missing from the draft store",
        );
      }
      await ctx.db.patch(page._id, {
        parentId: snapshot.parentId,
        title: snapshot.title,
        slug: snapshot.slug,
        icon: snapshot.icon,
        order: snapshot.order,
        deletedAt: undefined,
        updatedAt: now,
      });
      const document = documentByPageId.get(snapshot.pageId);
      if (snapshot.contentRevisionId) {
        const revision = await ctx.db.get(snapshot.contentRevisionId);
        if (!revision) {
          throw new ConvexError("Historical page content is missing");
        }
        if (document) {
          await ctx.db.patch(document._id, {
            revisionId: snapshot.contentRevisionId,
            contentHash: snapshot.contentHash ?? "",
            contentSize: revision.contentSize,
            updatedAt: now,
          });
        } else {
          await ctx.db.insert("pageDocuments", {
            siteId: site._id,
            pageId: snapshot.pageId,
            revisionId: snapshot.contentRevisionId,
            contentHash: snapshot.contentHash ?? "",
            contentSize: revision.contentSize,
            updatedAt: now,
          });
        }
      } else if (document) {
        await ctx.db.delete(document._id);
      }
    }

    for (const library of libraries) {
      if (
        !releasedLibraryIds.has(library._id) &&
        library.deletedAt === undefined
      ) {
        await ctx.db.patch(library._id, { deletedAt: now, updatedAt: now });
      }
    }
    for (const snapshot of releaseLibraries) {
      const library = libraryById.get(snapshot.libraryId);
      if (!library) throw new ConvexError("Historical library is missing");
      await ctx.db.patch(library._id, {
        name: snapshot.name,
        deletedAt: undefined,
        updatedAt: now,
      });
    }
    for (const folder of folders) {
      if (
        libraryById.has(folder.libraryId) &&
        !releasedFolderIds.has(folder._id) &&
        folder.deletedAt === undefined
      ) {
        await ctx.db.patch(folder._id, { deletedAt: now, updatedAt: now });
      }
    }
    for (const snapshot of releaseFolders) {
      const folder = folderById.get(snapshot.folderId);
      if (!folder) throw new ConvexError("Historical folder is missing");
      await ctx.db.patch(folder._id, {
        libraryId: snapshot.libraryId,
        parentId: snapshot.parentId,
        name: snapshot.name,
        order: snapshot.order,
        deletedAt: undefined,
        updatedAt: now,
      });
    }
    for (const file of files) {
      if (!releasedFileIds.has(file._id) && file.deletedAt === undefined) {
        await ctx.db.patch(file._id, { deletedAt: now });
      }
    }
    for (const snapshot of releaseFiles) {
      const file = fileById.get(snapshot.fileId);
      if (!file) throw new ConvexError("Historical file is missing");
      await ctx.db.patch(file._id, {
        objectKey: snapshot.objectKey,
        filename: snapshot.filename,
        contentType: snapshot.contentType,
        size: snapshot.size,
        checksum: snapshot.checksum,
        libraryId: snapshot.libraryId,
        folderId: snapshot.folderId,
        order: snapshot.order,
        deletedAt: undefined,
      });
    }
    for (const parentId of parentsToSynchronize) {
      await synchronizeParentDocument(ctx, parentId, now, {
        touchDraft: false,
      });
    }

    await ctx.db.patch(site._id, {
      name: release.name,
      logoFileId: release.logoFileId,
      logoUrl: release.logoFileId
        ? buildFileUrl(release.logoFileId)
        : undefined,
      defaultPageId: release.defaultPageId,
      settings: release.settings,
      draftRevision,
      draftBaseReleaseId: releaseId,
      updatedAt: now,
    });
    await clearDraftChanges(ctx, site._id);
    await ctx.db.insert("publicationEvents", {
      siteId: site._id,
      action: "restoreDraft",
      fromReleaseId: site.liveReleaseId,
      toReleaseId: releaseId,
      actorId: auth.userId,
      createdAt: now,
    });
    return draftRevision;
  },
});
