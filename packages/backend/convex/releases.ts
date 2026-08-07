import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { buildFileUrl, deleteFileRows } from "./files";
import { reconcileRestoredFile } from "./fileExtraction";
import { clearDraftChanges } from "./model/draftChanges";
import { synchronizeParentDocument } from "./model/pageHierarchy";
import {
  extractionBlocksPublication,
  isPublicationInFlight,
  publicationActionForTarget,
} from "./model/releaseState";
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

const nonterminalPublicationStatuses = [
  "building",
  "clearing",
  "aborting",
] as const;

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

export const getPublicationStatus = query({
  args: { releaseId: v.id("siteReleases") },
  returns: v.union(
    v.null(),
    v.object({
      status: v.union(
        v.literal("building"),
        v.literal("aborting"),
        v.literal("clearing"),
        v.literal("complete"),
        v.literal("failed"),
      ),
      failure: v.optional(v.string()),
    }),
  ),
  handler: async (ctx, { releaseId }) => {
    const release = await ctx.db.get(releaseId);
    if (!release || !(await requireSiteForMember(ctx, release.siteId))) {
      return null;
    }
    return {
      status: release.publicationStatus ?? "complete",
      failure: release.publicationFailure,
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
    return releases
      .filter(
        (release) =>
          release.publicationStatus === undefined ||
          release.publicationStatus === "complete",
      )
      .map((release) => ({
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
    if (
      !release ||
      (release.publicationStatus !== undefined &&
        release.publicationStatus !== "complete")
    ) {
      return null;
    }
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

    const activePublications = await Promise.all(
      nonterminalPublicationStatuses.map((status) =>
        ctx.db
          .query("siteReleases")
          .withIndex("by_site_publication_status", (q) =>
            q.eq("siteId", siteId).eq("publicationStatus", status),
          )
          .first(),
      ),
    );
    const activePublication = activePublications.find(Boolean);
    if (
      activePublication &&
      isPublicationInFlight(activePublication.publicationStatus)
    ) {
      if (
        activePublication.publicationStatus === "building" &&
        activePublication.sourceDraftRevision === draftRevision
      ) {
        return {
          releaseId: activePublication._id,
          number: activePublication.number,
          reused: false,
        };
      }
      throw new ConvexError(
        "A previous publication is still finishing. Try again shortly.",
      );
    }

    const [queuedExtraction, processingExtraction] = await Promise.all([
      ctx.db
        .query("fileExtractions")
        .withIndex("by_site_status", (q) =>
          q.eq("siteId", siteId).eq("status", "queued"),
        )
        .first(),
      ctx.db
        .query("fileExtractions")
        .withIndex("by_site_status", (q) =>
          q.eq("siteId", siteId).eq("status", "processing"),
        )
        .first(),
    ]);
    if (
      (queuedExtraction &&
        extractionBlocksPublication(queuedExtraction.status)) ||
      (processingExtraction &&
        extractionBlocksPublication(processingExtraction.status))
    ) {
      throw new ConvexError(
        "Document text extraction is still in progress. Try publishing again shortly.",
      );
    }

    const matchingRelease = site.draftBaseReleaseId
      ? await ctx.db.get(site.draftBaseReleaseId)
      : null;
    const pendingChange = await ctx.db
      .query("draftChanges")
      .withIndex("by_site", (q) => q.eq("siteId", siteId))
      .first();
    if (
      matchingRelease &&
      (matchingRelease.publicationStatus === undefined ||
        matchingRelease.publicationStatus === "complete") &&
      !pendingChange
    ) {
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

    if (site.liveReleaseId && !pendingChange) {
      throw new ConvexError("There are no unpublished changes");
    }

    if (site.defaultPageId) {
      const defaultPage = await ctx.db.get(site.defaultPageId);
      if (
        !defaultPage ||
        defaultPage.siteId !== siteId ||
        defaultPage.deletedAt !== undefined
      ) {
        throw new ConvexError("The default page is missing from the draft");
      }
    }

    const now = Date.now();
    const number = site.nextReleaseNumber ?? 1;
    const publicationToken = crypto.randomUUID();
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
      pageCount: 0,
      changeCount: 0,
      publicationStatus: "building",
      publicationToken,
      publicationPhase: "pages",
      publicationUpdatedAt: now,
    });
    await ctx.db.patch(siteId, {
      nextReleaseNumber: number + 1,
      updatedAt: now,
    });
    await ctx.scheduler.runAfter(0, internal.releasePublication.processBatch, {
      releaseId,
      token: publicationToken,
      phase: "pages",
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
    if (
      release.publicationStatus !== undefined &&
      release.publicationStatus !== "complete"
    ) {
      throw new ConvexError("Release publication is not complete");
    }
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
        await deleteFileRows(ctx, file);
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
      const restored = await ctx.db.get(file._id);
      if (restored) await reconcileRestoredFile(ctx, restored);
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
