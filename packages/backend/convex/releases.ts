import { ConvexError, v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { buildFileUrl } from "./files";
import { collectReleaseChanges } from "./model/releaseChanges";
import {
  changedField,
  openEditorContentLines,
  type ReleaseDetailedChange,
  type ReleaseFieldDiff,
} from "./model/releaseDiff";
import {
  findReleaseForDraftRevision,
  publicationActionForTarget,
} from "./model/releaseState";
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

function indexBy<T>(values: T[], id: (value: T) => string) {
  return new Map(values.map((value) => [id(value), value]));
}

function compactFields(
  fields: Array<ReleaseFieldDiff | null>,
): ReleaseFieldDiff[] {
  return fields.filter((field): field is ReleaseFieldDiff => field !== null);
}

function releasePath(
  page: { pageId: string; parentId?: string; slug: string },
  pagesById: Map<string, { pageId: string; parentId?: string; slug: string }>,
): string {
  const segments = [page.slug];
  const visited = new Set([page.pageId]);
  let parentId = page.parentId;
  while (parentId && !visited.has(parentId)) {
    visited.add(parentId);
    const parent = pagesById.get(parentId);
    if (!parent) break;
    segments.unshift(parent.slug);
    parentId = parent.parentId;
  }
  return `/${segments.join("/")}`;
}

export const getDraftStatus = query({
  args: { siteId: v.id("sites") },
  returns: v.any(),
  handler: async (ctx, { siteId }) => {
    const site = await requireSiteForMember(ctx, siteId);
    if (!site) return null;
    const changes = await collectReleaseChanges(ctx, site, site.liveReleaseId);
    const liveRelease = site.liveReleaseId
      ? await ctx.db.get(site.liveReleaseId)
      : null;
    return {
      draftRevision: site.draftRevision ?? 0,
      liveRelease,
      nextReleaseNumber: site.nextReleaseNumber ?? 1,
      hasUnpublishedChanges: changes.length > 0,
      changes,
    };
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
    const baseReleaseId = release.previousReleaseId;
    const [
      pages,
      libraries,
      folders,
      files,
      previousRelease,
      previousPages,
      previousLibraries,
      previousFolders,
      previousFiles,
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

    const blobIds = new Set(
      [...pages, ...previousPages]
        .map((page) => page.blobId)
        .filter((blobId) => blobId !== undefined),
    );
    const blobs = await Promise.all(
      [...blobIds].map(async (blobId) => ({
        blobId,
        blob: await ctx.db.get(blobId),
      })),
    );
    const blobContent = new Map(
      blobs.map(({ blobId, blob }) => [blobId, blob?.content]),
    );
    const currentPagesById = indexBy(pages, (page) => page.pageId);
    const previousPagesById = indexBy(previousPages, (page) => page.pageId);
    const detailedChanges: ReleaseDetailedChange[] = [];

    const siteFields = compactFields([
      changedField("Site name", previousRelease?.name, release.name),
      changedField("Logo", previousRelease?.logoFileId, release.logoFileId),
      changedField(
        "Default page",
        previousRelease?.defaultPageId
          ? previousPagesById.get(previousRelease.defaultPageId)?.title
          : undefined,
        release.defaultPageId
          ? currentPagesById.get(release.defaultPageId)?.title
          : undefined,
      ),
      changedField(
        "Navigation expanded by default",
        previousRelease?.settings.expandNavigationByDefault,
        release.settings.expandNavigationByDefault,
      ),
      changedField(
        "Sidebar",
        previousRelease?.settings.sidebarVariant,
        release.settings.sidebarVariant,
      ),
      changedField(
        "Show logo",
        previousRelease?.settings.showLogo,
        release.settings.showLogo,
      ),
      changedField(
        "Show site name",
        previousRelease?.settings.showSiteName,
        release.settings.showSiteName,
      ),
      changedField(
        "Show header search",
        previousRelease?.settings.showHeaderSearch,
        release.settings.showHeaderSearch,
      ),
      changedField(
        "Favicon",
        previousRelease?.settings.favicon,
        release.settings.favicon,
      ),
      changedField(
        "Theme palette",
        previousRelease?.settings.theme?.palette,
        release.settings.theme?.palette,
      ),
      changedField(
        "Theme style",
        previousRelease?.settings.theme?.style,
        release.settings.theme?.style,
      ),
      changedField(
        "Brand color",
        previousRelease?.settings.theme?.brandColor,
        release.settings.theme?.brandColor,
      ),
    ]);
    if (siteFields.length > 0) {
      detailedChanges.push({
        entityType: "site",
        entityId: release.siteId,
        changeType: previousRelease ? "updated" : "added",
        label: "Site settings",
        fields: siteFields,
      });
    }

    for (const pageId of new Set([
      ...currentPagesById.keys(),
      ...previousPagesById.keys(),
    ])) {
      const current = currentPagesById.get(pageId);
      const previous = previousPagesById.get(pageId);
      const fields = compactFields([
        changedField("Title", previous?.title, current?.title),
        changedField(
          "URL",
          previous ? releasePath(previous, previousPagesById) : undefined,
          current ? releasePath(current, currentPagesById) : undefined,
        ),
        changedField("Icon", previous?.icon, current?.icon),
        changedField("Position", previous?.order, current?.order),
      ]);
      const contentChanged =
        !current || !previous || current.contentHash !== previous.contentHash;
      if (fields.length === 0 && !contentChanged) continue;
      const beforeLines = openEditorContentLines(
        previous?.blobId ? blobContent.get(previous.blobId) : undefined,
      );
      const afterLines = openEditorContentLines(
        current?.blobId ? blobContent.get(current.blobId) : undefined,
      );
      const movedOnly =
        fields.length > 0 &&
        fields.every(
          (field) => field.label === "URL" || field.label === "Position",
        ) &&
        !contentChanged;
      detailedChanges.push({
        entityType: "page",
        entityId: pageId,
        changeType: !previous
          ? "added"
          : !current
            ? "deleted"
            : movedOnly
              ? "moved"
              : "updated",
        label: current?.title ?? previous?.title ?? "Untitled page",
        fields,
        content: contentChanged
          ? {
              beforeLines,
              afterLines,
            }
          : undefined,
      });
    }

    function addEntityChanges<T extends { name: string }>(options: {
      entityType: "library" | "folder";
      current: T[];
      previous: T[];
      id: (value: T) => string;
      fields: (
        before: T | undefined,
        after: T | undefined,
      ) => ReleaseFieldDiff[];
    }) {
      const currentById = indexBy(options.current, options.id);
      const previousById = indexBy(options.previous, options.id);
      for (const entityId of new Set([
        ...currentById.keys(),
        ...previousById.keys(),
      ])) {
        const current = currentById.get(entityId);
        const previous = previousById.get(entityId);
        const entityFields = options.fields(previous, current);
        if (entityFields.length === 0) continue;
        detailedChanges.push({
          entityType: options.entityType,
          entityId,
          changeType: !previous ? "added" : !current ? "deleted" : "updated",
          label: current?.name ?? previous?.name ?? "Untitled",
          fields: entityFields,
        });
      }
    }

    addEntityChanges({
      entityType: "library",
      current: libraries,
      previous: previousLibraries,
      id: (library) => library.libraryId,
      fields: (before, after) =>
        compactFields([changedField("Name", before?.name, after?.name)]),
    });
    addEntityChanges({
      entityType: "folder",
      current: folders,
      previous: previousFolders,
      id: (folder) => folder.folderId,
      fields: (before, after) =>
        compactFields([
          changedField("Name", before?.name, after?.name),
          changedField("Parent folder", before?.parentId, after?.parentId),
          changedField("Position", before?.order, after?.order),
        ]),
    });

    const currentFilesById = indexBy(files, (file) => file.fileId);
    const previousFilesById = indexBy(previousFiles, (file) => file.fileId);
    for (const fileId of new Set([
      ...currentFilesById.keys(),
      ...previousFilesById.keys(),
    ])) {
      const current = currentFilesById.get(fileId);
      const previous = previousFilesById.get(fileId);
      const fields = compactFields([
        changedField("Name", previous?.filename, current?.filename),
        changedField("Folder", previous?.folderId, current?.folderId),
        changedField("Type", previous?.contentType, current?.contentType),
        changedField("Size", previous?.size, current?.size),
        changedField("File content", previous?.checksum, current?.checksum),
      ]);
      if (fields.length === 0) continue;
      detailedChanges.push({
        entityType: "file",
        entityId: fileId,
        changeType: !previous ? "added" : !current ? "deleted" : "updated",
        label: current?.filename ?? previous?.filename ?? "Untitled file",
        fields,
      });
    }

    return {
      release: { ...release, isLive: site.liveReleaseId === releaseId },
      changes: detailedChanges,
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

    const releases = await ctx.db
      .query("siteReleases")
      .withIndex("by_site", (q) => q.eq("siteId", siteId))
      .order("desc")
      .collect();
    const matchingRelease = findReleaseForDraftRevision(
      releases,
      draftRevision,
    );
    if (matchingRelease) {
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
        ctx.db.query("documentFolders").collect(),
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
    const changes = await collectReleaseChanges(ctx, site, site.liveReleaseId);
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
      previousReleaseId: site.liveReleaseId,
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
        blobId: document?.blobId,
        contentHash: document?.contentHash,
        updatedAt: Math.max(page.updatedAt, document?.updatedAt ?? 0),
      });
      const blob = document ? await ctx.db.get(document.blobId) : null;
      const text = blob
        ? extractOpenEditorText(parseOpenEditorDocument(blob.content))
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
      await ctx.db.insert("releaseChanges", { releaseId, ...change });
    }

    await ctx.db.patch(siteId, {
      liveReleaseId: releaseId,
      nextReleaseNumber: number + 1,
      updatedAt: now,
    });
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
      ctx.db.query("documentFolders").collect(),
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
      if (snapshot.blobId) {
        const blob = await ctx.db.get(snapshot.blobId);
        if (!blob) throw new ConvexError("Historical page content is missing");
        if (document) {
          await ctx.db.patch(document._id, {
            blobId: snapshot.blobId,
            contentHash: snapshot.contentHash ?? "",
            contentSize: blob.content.length,
            referencesKey: "",
            updatedAt: now,
          });
        } else {
          await ctx.db.insert("pageDocuments", {
            siteId: site._id,
            pageId: snapshot.pageId,
            blobId: snapshot.blobId,
            contentHash: snapshot.contentHash ?? "",
            contentSize: blob.content.length,
            referencesKey: "",
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

    await ctx.db.patch(site._id, {
      name: release.name,
      logoFileId: release.logoFileId,
      logoUrl: release.logoFileId
        ? buildFileUrl(release.logoFileId)
        : undefined,
      defaultPageId: release.defaultPageId,
      settings: release.settings,
      draftRevision,
      updatedAt: now,
    });
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
