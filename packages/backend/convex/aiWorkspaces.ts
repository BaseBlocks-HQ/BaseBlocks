import { v } from "convex/values";
import {
  fingerprintSnapshotPage,
  type Snapshot,
} from "@openeditor/workspace";
import type { JsonObject } from "@openeditor/core";
import { query } from "./_generated/server";
import {
  MAX_AI_SITE_PAGES,
  MAX_AI_REFERENCE_FILES,
  MAX_AI_REFERENCE_LIBRARIES,
  assertWorkspaceMetadataSize,
  assertWorkspaceDocumentContentSize,
  assertWorkspacePageFields,
  assertWorkspaceReferenceCounts,
} from "./model/aiWorkspaceBounds";
import { emptyOpenEditorDocument } from "./pageContentFormat";
import { requireOrganizationPermission } from "./permissions";
import { fingerprintAiProjectTrustRoot } from "./model/aiWorkspaceFingerprint";
import { readPageDocumentRecord } from "./model/pageDocuments";
import { assertDraftReadable } from "./model/draft";

function jsonMetadata(value: unknown): JsonObject {
  return JSON.parse(JSON.stringify(value)) as JsonObject;
}

/**
 * Export the authoritative draft as an agent workspace snapshot.
 *
 * The snapshot is deliberately read-only and carries both the site revision and
 * each page content hash. Consumers must pass those values back to
 * `siteAssistantRuns.applyWorkspaceChanges`; possessing a snapshot never
 * grants write authority.
 */
export const exportDraft = query({
  args: { siteId: v.id("sites") },
  returns: v.any(),
  handler: async (ctx, { siteId }) => {
    const site = await ctx.db.get(siteId);
    if (!site) return null;
    await requireOrganizationPermission(ctx, site.organizationId, {
      resource: "content",
      action: "edit",
    });
    assertDraftReadable(site);

    const [activePages, libraries, files] = await Promise.all([
      ctx.db
        .query("pages")
        .withIndex("by_site", (q) => q.eq("siteId", siteId))
        .filter((q) => q.eq(q.field("deletedAt"), undefined))
        .take(MAX_AI_SITE_PAGES + 1),
      ctx.db
        .query("documentLibraries")
        .withIndex("by_site", (q) => q.eq("siteId", siteId))
        .filter((q) => q.eq(q.field("deletedAt"), undefined))
        .take(MAX_AI_REFERENCE_LIBRARIES + 1),
      ctx.db
        .query("files")
        .withIndex("by_site", (q) => q.eq("siteId", siteId))
        .filter((q) => q.eq(q.field("deletedAt"), undefined))
        .take(MAX_AI_REFERENCE_FILES + 1),
    ]);
    if (activePages.length > MAX_AI_SITE_PAGES) {
      throw new Error(
        `Site exceeds the ${MAX_AI_SITE_PAGES} page AI workspace limit`,
      );
    }
    assertWorkspaceReferenceCounts({
      libraryCount: libraries.length,
      fileCount: files.length,
    });
    activePages.sort((a, b) => a.order - b.order || a._id.localeCompare(b._id));
    assertWorkspacePageFields(
      activePages.map((page) => ({
        pageId: String(page._id),
        parentId: page.parentId ? String(page.parentId) : undefined,
        title: page.title,
        slug: page.slug,
        icon: page.icon,
        order: page.order,
      })),
    );
    const pageDocuments = await Promise.all(
      activePages.map((page) =>
        ctx.db
          .query("pageDocuments")
          .withIndex("by_page", (q) => q.eq("pageId", page._id))
          .unique(),
      ),
    );
    assertWorkspaceDocumentContentSize(pageDocuments);
    const documentByPageId = new Map(
      pageDocuments.flatMap((document) =>
        document ? [[document.pageId, document] as const] : [],
      ),
    );
    const workspaceMetadata = {
      site: {
        siteId: site._id,
        name: site.name,
        slug: site.slug,
        defaultPageId: site.defaultPageId,
        draftRevision: site.draftRevision,
        settings: site.settings,
      },
      pages: activePages.map((page) => ({
        pageId: page._id,
        parentId: page.parentId,
        title: page.title,
        slug: page.slug,
        icon: page.icon,
        order: page.order,
      })),
      references: {
        libraries: libraries.map((library) => ({
          libraryId: library._id,
          name: library.name,
        })),
        files: files.map((file) => ({
          fileId: file._id,
          filename: file.filename,
          kind: file.kind,
          contentType: file.contentType,
          libraryId: file.libraryId,
        })),
      },
    };
    assertWorkspaceMetadataSize(workspaceMetadata);

    const documents = await Promise.all(
      pageDocuments.flatMap((document) =>
        document
          ? [
              readPageDocumentRecord(ctx, document).then(
                (value) => [document.pageId, value] as const,
              ),
            ]
          : [],
      ),
    );
    const contentByPageId = new Map(documents);

    const references = {
      ...workspaceMetadata.references,
    };
    const pages = activePages.map((page) => {
      const record = documentByPageId.get(page._id);
      const document = contentByPageId.get(page._id);
      return {
        pageId: page._id,
        parentId: page.parentId,
        title: page.title,
        slug: page.slug,
        icon: page.icon,
        order: page.order,
        updatedAt: Math.max(page.updatedAt, record?.updatedAt ?? 0),
        contentHash: record?.contentHash ?? null,
        document: document ?? emptyOpenEditorDocument(),
      };
    });
    const project: Snapshot = {
      id: String(site._id),
      revision: String(site.draftRevision),
      title: site.name,
      metadata: jsonMetadata({
        defaultPageId: site.defaultPageId ?? null,
        siteSlug: site.slug,
        settings: site.settings,
        references,
      }),
      pages: pages.map((page) => ({
        id: String(page.pageId),
        title: page.title,
        slug: page.slug,
        parentId: page.parentId ? String(page.parentId) : null,
        order: page.order,
        metadata: jsonMetadata({ icon: page.icon ?? null }),
        document: page.document,
      })),
    };
    const [trustRoot, pageFingerprints] = await Promise.all([
      fingerprintAiProjectTrustRoot(project),
      Promise.all(
        project.pages.map(async (page) => ({
          pageId: page.id,
          fingerprint: await fingerprintSnapshotPage(page),
        })),
      ),
    ]);

    return {
      format: "openeditor-workspace",
      version: 1,
      site: {
        ...workspaceMetadata.site,
      },
      pages,
      references,
      trust: {
        projectFingerprint: trustRoot.projectFingerprint,
        siteFingerprint: trustRoot.siteFingerprint,
        pageFingerprints,
      },
    };
  },
});

/**
 * Compact, cacheable workspace discovery for the agent fast path. Page bodies
 * are deliberately excluded and fetched through `readPage` only when a tool
 * needs them.
 */
export const getManifest = query({
  args: { siteId: v.id("sites") },
  returns: v.any(),
  handler: async (ctx, { siteId }) => {
    const site = await ctx.db.get(siteId);
    if (!site) return null;
    await requireOrganizationPermission(ctx, site.organizationId, {
      resource: "content",
      action: "edit",
    });
    assertDraftReadable(site);

    const [pages, documents, libraries, files] = await Promise.all([
      ctx.db
        .query("pages")
        .withIndex("by_site", (q) => q.eq("siteId", siteId))
        .filter((q) => q.eq(q.field("deletedAt"), undefined))
        .take(MAX_AI_SITE_PAGES + 1),
      ctx.db
        .query("pageDocuments")
        .withIndex("by_site", (q) => q.eq("siteId", siteId))
        .take(MAX_AI_SITE_PAGES + 1),
      ctx.db
        .query("documentLibraries")
        .withIndex("by_site", (q) => q.eq("siteId", siteId))
        .filter((q) => q.eq(q.field("deletedAt"), undefined))
        .take(MAX_AI_REFERENCE_LIBRARIES + 1),
      ctx.db
        .query("files")
        .withIndex("by_site", (q) => q.eq("siteId", siteId))
        .filter((q) => q.eq(q.field("deletedAt"), undefined))
        .take(MAX_AI_REFERENCE_FILES + 1),
    ]);
    if (pages.length > MAX_AI_SITE_PAGES) {
      throw new Error(
        `Site exceeds the ${MAX_AI_SITE_PAGES} page AI workspace limit`,
      );
    }
    assertWorkspaceReferenceCounts({
      libraryCount: libraries.length,
      fileCount: files.length,
    });
    const documentByPage = new Map(
      documents.map((document) => [document.pageId, document] as const),
    );
    pages.sort(
      (left, right) =>
        left.order - right.order || left._id.localeCompare(right._id),
    );
    return {
      site: {
        siteId: site._id,
        name: site.name,
        slug: site.slug,
        defaultPageId: site.defaultPageId,
        draftRevision: site.draftRevision,
        settings: site.settings,
      },
      pages: pages.map((page) => {
        const document = documentByPage.get(page._id);
        return {
          pageId: page._id,
          parentId: page.parentId,
          title: page.title,
          slug: page.slug,
          icon: page.icon,
          order: page.order,
          contentHash: document?.contentHash ?? null,
          contentSize: document?.contentSize ?? 0,
          updatedAt: Math.max(page.updatedAt, document?.updatedAt ?? 0),
        };
      }),
      references: {
        libraries: libraries.map((library) => ({
          libraryId: library._id,
          name: library.name,
        })),
        files: files.map((file) => ({
          fileId: file._id,
          filename: file.filename,
          kind: file.kind,
          contentType: file.contentType,
          libraryId: file.libraryId,
        })),
      },
    };
  },
});

export const readPage = query({
  args: { siteId: v.id("sites"), pageId: v.id("pages") },
  returns: v.any(),
  handler: async (ctx, { siteId, pageId }) => {
    const [site, page] = await Promise.all([
      ctx.db.get(siteId),
      ctx.db.get(pageId),
    ]);
    if (
      !site ||
      !page ||
      page.siteId !== siteId ||
      page.deletedAt !== undefined
    ) {
      return null;
    }
    await requireOrganizationPermission(ctx, site.organizationId, {
      resource: "content",
      action: "edit",
    });
    assertDraftReadable(site);
    const record = await ctx.db
      .query("pageDocuments")
      .withIndex("by_page", (q) => q.eq("pageId", pageId))
      .unique();
    return {
      pageId,
      contentHash: record?.contentHash ?? null,
      updatedAt: Math.max(page.updatedAt, record?.updatedAt ?? 0),
      document: record
        ? await readPageDocumentRecord(ctx, record)
        : emptyOpenEditorDocument(),
    };
  },
});
