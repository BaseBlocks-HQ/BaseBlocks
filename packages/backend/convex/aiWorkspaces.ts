import { v } from "convex/values";
import {
  fingerprintProjectPage,
  type OpenEditorProjectSnapshot,
} from "@openeditor/workspace";
import type { JsonObject } from "@openeditor/core";
import { query } from "./_generated/server";
import { MAX_AI_SITE_PAGES } from "./model/aiChangesetPlan";
import {
  MAX_AI_REFERENCE_FILES,
  MAX_AI_REFERENCE_LIBRARIES,
  assertWorkspaceMetadataSize,
  assertWorkspaceDocumentContentSize,
  assertWorkspacePageFields,
  assertWorkspaceReferenceCounts,
} from "./model/aiWorkspaceBounds";
import {
  emptyOpenEditorDocument,
  parseOpenEditorDocument,
} from "./pageContentFormat";
import { requireOrganizationPermission } from "./permissions";
import { fingerprintAiProjectTrustRoot } from "./model/aiWorkspaceFingerprint";

function jsonMetadata(value: unknown): JsonObject {
  return JSON.parse(JSON.stringify(value)) as JsonObject;
}

/**
 * Export the authoritative draft as an agent workspace snapshot.
 *
 * The snapshot is deliberately read-only and carries both the site revision and
 * each page content hash. Consumers must pass those values back to
 * `aiChangesets.apply`; possessing a snapshot never grants write authority.
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
        draftRevision: site.draftRevision ?? 0,
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

    const blobIds = new Set(
      pageDocuments.flatMap((document) => (document ? [document.blobId] : [])),
    );
    const blobs = await Promise.all(
      [...blobIds].map(
        async (blobId) => [blobId, await ctx.db.get(blobId)] as const,
      ),
    );
    const blobById = new Map(blobs);

    const references = {
      ...workspaceMetadata.references,
    };
    const pages = activePages.map((page) => {
      const record = documentByPageId.get(page._id);
      const blob = record ? blobById.get(record.blobId) : null;
      return {
        pageId: page._id,
        parentId: page.parentId,
        title: page.title,
        slug: page.slug,
        icon: page.icon,
        order: page.order,
        updatedAt: Math.max(page.updatedAt, record?.updatedAt ?? 0),
        contentHash: record?.contentHash ?? null,
        document: blob
          ? parseOpenEditorDocument(blob.content)
          : emptyOpenEditorDocument(),
      };
    });
    const project: OpenEditorProjectSnapshot = {
      id: String(site._id),
      revision: String(site.draftRevision ?? 0),
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
          fingerprint: await fingerprintProjectPage(page),
        })),
      ),
    ]);

    return {
      format: "openeditor-workspace",
      version: 1,
      exportedAt: Date.now(),
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
