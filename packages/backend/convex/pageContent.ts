import { ConvexError, getConvexSize, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { readPageContent, getPageDocument } from "./model/pageDocuments";
import { getOrCreateContentObject } from "./model/contentObjects";
import {
  hashOpenEditorContent,
  parseOpenEditorDocument,
  type OpenEditorDocument,
} from "./pageContentFormat";
import {
  isOrganizationMember,
  requireOrganizationPermission,
} from "./permissions";
import { queuePageContentIndex } from "./search";
import { touchSiteDraft } from "./model/draft";

const MAX_PAGE_CONTENT_BYTES = 900_000;

export const get = query({
  args: { pageId: v.id("pages") },
  returns: v.any(),
  handler: async (ctx, { pageId }) => {
    const page = await ctx.db.get(pageId);
    if (!page || page.deletedAt !== undefined) return null;
    const site = await ctx.db.get(page.siteId);
    if (!site || !(await isOrganizationMember(ctx, site.organizationId))) {
      return null;
    }
    return (await readPageContent(ctx, pageId)).document;
  },
});

export const save = mutation({
  args: { pageId: v.id("pages"), content: v.any() },
  returns: v.string(),
  handler: async (ctx, { pageId, content }) => {
    const page = await ctx.db.get(pageId);
    if (!page) throw new ConvexError("Page not found");
    const site = await ctx.db.get(page.siteId);
    if (!site) throw new ConvexError("Site not found");
    await requireOrganizationPermission(ctx, site.organizationId, {
      resource: "content",
      action: "edit",
    });

    let parsedDocument: OpenEditorDocument;
    try {
      parsedDocument = parseOpenEditorDocument(content);
    } catch {
      throw new ConvexError("Invalid OpenEditor document");
    }
    const serializedDocument = JSON.stringify(parsedDocument);
    const contentSize = getConvexSize(serializedDocument);
    if (contentSize > MAX_PAGE_CONTENT_BYTES) {
      throw new ConvexError(
        "This page is too large. Split it into child pages.",
      );
    }

    const contentHash = hashOpenEditorContent(serializedDocument);
    const existing = await getPageDocument(ctx, pageId);
    if (existing?.contentHash === contentHash) {
      return existing.contentHash;
    }

    const updatedAt = Date.now();
    const { revisionId } = await getOrCreateContentObject(ctx, {
      siteId: page.siteId,
      content: serializedDocument,
      contentHash,
      contentSize,
      document: parsedDocument,
      createdAt: updatedAt,
    });
    if (existing) {
      await ctx.db.patch(existing._id, {
        revisionId,
        contentHash,
        contentSize,
        updatedAt,
      });
    } else {
      await ctx.db.insert("pageDocuments", {
        siteId: page.siteId,
        pageId,
        revisionId,
        contentHash,
        contentSize,
        updatedAt,
      });
    }
    await touchSiteDraft(ctx, page.siteId, updatedAt, [
      { entityType: "page", entityId: pageId },
    ]);

    await queuePageContentIndex(ctx, pageId, revisionId, contentHash);
    return contentHash;
  },
});
