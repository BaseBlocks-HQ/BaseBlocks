import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { readPageContent, writePageContent } from "./model/pageDocuments";
import { softDeletePageSubtree } from "./model/pageDeletion";
import {
  extractOpenEditorReferences,
  hashOpenEditorContent,
  parseOpenEditorDocument,
  synchronizeOpenEditorChildPages,
  type OpenEditorDocument,
} from "./pageContentFormat";
import {
  isOrganizationMember,
  requireOrganizationPermission,
} from "./permissions";
import { queuePageContentIndex } from "./search";
import { assertDraftReadable, touchSiteDraft } from "./model/draft";

export const get = query({
  args: { pageId: v.id("pages") },
  returns: v.any(),
  handler: async (ctx, { pageId }) => {
    const page = await ctx.db.get(pageId);
    if (!page) return null;
    const site = await ctx.db.get(page.siteId);
    if (!site || !(await isOrganizationMember(ctx, site.organizationId))) {
      return null;
    }
    assertDraftReadable(site);
    if (page.deletedAt !== undefined) return null;
    return (await readPageContent(ctx, pageId)).document;
  },
});

export const getVersioned = query({
  args: { pageId: v.id("pages") },
  handler: async (ctx, { pageId }) => {
    const page = await ctx.db.get(pageId);
    if (!page) return null;
    const site = await ctx.db.get(page.siteId);
    if (!site || !(await isOrganizationMember(ctx, site.organizationId))) {
      return null;
    }
    assertDraftReadable(site);
    if (page.deletedAt !== undefined) return null;
    const current = await readPageContent(ctx, pageId);
    return {
      document: current.document,
      contentHash:
        current.record?.contentHash ??
        hashOpenEditorContent(JSON.stringify(current.document)),
    };
  },
});

export const save = mutation({
  args: {
    pageId: v.id("pages"),
    content: v.any(),
    expectedContentHash: v.string(),
  },
  handler: async (ctx, { pageId, content, expectedContentHash }) => {
    const page = await ctx.db.get(pageId);
    if (!page || page.deletedAt !== undefined) {
      throw new ConvexError("Page not found");
    }
    const site = await ctx.db.get(page.siteId);
    if (!site) throw new ConvexError("Site not found");
    await requireOrganizationPermission(ctx, site.organizationId, {
      resource: "content",
      action: "edit",
    });

    let parsedDocument: OpenEditorDocument;
    try {
      parsedDocument = parseOpenEditorDocument(content);
    } catch (error) {
      throw new ConvexError({
        code: "INVALID_OPENEDITOR_DOCUMENT",
        message:
          error instanceof Error
            ? error.message
            : "Invalid OpenEditor document",
      });
    }
    const updatedAt = Date.now();
    const current = await readPageContent(ctx, pageId);
    const currentContentHash =
      current.record?.contentHash ??
      hashOpenEditorContent(JSON.stringify(current.document));
    if (expectedContentHash !== currentContentHash) {
      return {
        status: "conflict" as const,
        document: current.document,
        contentHash: currentContentHash,
      };
    }
    let children = (
      await ctx.db
        .query("pages")
        .withIndex("by_parent_order", (q) =>
          q.eq("siteId", page.siteId).eq("parentId", pageId),
        )
        .collect()
    ).filter((child) => child.deletedAt === undefined);
    const deletedPageIds: Array<(typeof children)[number]["_id"]> = [];
    let defaultChanged = false;
    const submittedPageIds =
      extractOpenEditorReferences(parsedDocument).pageIds;
    for (const child of children) {
      if (submittedPageIds.has(child._id)) continue;
      const deleted = await softDeletePageSubtree(ctx, child._id, updatedAt);
      deletedPageIds.push(...deleted.deletedPageIds);
      defaultChanged ||= deleted.defaultChanged;
    }
    if (deletedPageIds.length > 0) {
      const deleted = new Set(deletedPageIds);
      children = children.filter((child) => !deleted.has(child._id));
    }
    const synchronized = synchronizeOpenEditorChildPages(
      parsedDocument,
      children.map((child) => ({
        pageId: child._id,
        title: child.title,
        icon: child.icon,
      })),
    );
    const { contentHash, revisionId, changed } = await writePageContent(
      ctx,
      pageId,
      synchronized,
      updatedAt,
    );
    if (!changed && deletedPageIds.length === 0) {
      return {
        status: "saved" as const,
        document: synchronized,
        contentHash,
      };
    }
    await touchSiteDraft(ctx, page.siteId, updatedAt, [
      ...(defaultChanged
        ? [{ entityType: "site" as const, entityId: site._id }]
        : []),
      { entityType: "page", entityId: pageId },
      ...deletedPageIds.map((entityId) => ({
        entityType: "page" as const,
        entityId,
      })),
    ]);

    if (changed) {
      await queuePageContentIndex(ctx, pageId, revisionId);
    }
    return {
      status: "saved" as const,
      document: synchronized,
      contentHash,
    };
  },
});
