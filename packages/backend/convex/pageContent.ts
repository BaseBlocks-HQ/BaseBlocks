import { ConvexError, getConvexSize, v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, query, type QueryCtx } from "./_generated/server";
import {
  emptyOpenEditorDocument,
  parseOpenEditorDocument,
} from "./openEditorDocuments";
import {
  isOrganizationMember,
  requireOrganizationPermission,
} from "./permissions";
import { canViewerAccessPublishedPageById } from "./sharing";
import { indexPageContent } from "./search";

export const pageContentValidator = v.object({ document: v.any() });

// Leave headroom for page/site IDs, timestamps, and Convex's document fields.
const MAX_PAGE_CONTENT_BYTES = 900_000;

async function getContent(ctx: Pick<QueryCtx, "db">, pageId: Id<"pages">) {
  const content = await ctx.db
    .query("openEditorPageContents")
    .withIndex("by_page", (q) => q.eq("pageId", pageId))
    .unique();
  return {
    document: content
      ? parseOpenEditorDocument(content.document)
      : emptyOpenEditorDocument(),
  };
}

export const get = query({
  args: { pageId: v.id("pages") },
  returns: pageContentValidator,
  handler: async (ctx, { pageId }) => {
    const page = await ctx.db.get("pages", pageId);
    if (!page) return { document: emptyOpenEditorDocument() };
    const site = await ctx.db.get("sites", page.siteId);
    if (!site || !(await isOrganizationMember(ctx, site.organizationId))) {
      return { document: emptyOpenEditorDocument() };
    }
    return getContent(ctx, pageId);
  },
});

export const getPublished = query({
  args: {
    pageId: v.id("pages"),
    sessionTokens: v.optional(v.array(v.string())),
  },
  returns: pageContentValidator,
  handler: async (ctx, { pageId, sessionTokens }) =>
    (await canViewerAccessPublishedPageById(ctx, pageId, sessionTokens))
      ? getContent(ctx, pageId)
      : { document: emptyOpenEditorDocument() },
});

export const save = mutation({
  args: { pageId: v.id("pages"), document: v.any() },
  returns: v.null(),
  handler: async (ctx, { pageId, document }) => {
    const page = await ctx.db.get("pages", pageId);
    if (!page) throw new ConvexError("Page not found");
    const site = await ctx.db.get("sites", page.siteId);
    if (!site) throw new ConvexError("Site not found");
    await requireOrganizationPermission(ctx, site.organizationId, {
      resource: "content",
      action: "edit",
    });
    try {
      parseOpenEditorDocument(document);
    } catch {
      throw new ConvexError("Invalid OpenEditor document");
    }
    const serializedDocument = JSON.stringify(document);
    if (getConvexSize(serializedDocument) > MAX_PAGE_CONTENT_BYTES) {
      throw new ConvexError(
        "This page is too large. Split it into child pages.",
      );
    }
    const existing = await ctx.db
      .query("openEditorPageContents")
      .withIndex("by_page", (q) => q.eq("pageId", pageId))
      .unique();
    const updatedAt = Date.now();
    if (existing) {
      await ctx.db.patch("openEditorPageContents", existing._id, {
        document: serializedDocument,
        updatedAt,
      });
    } else {
      await ctx.db.insert("openEditorPageContents", {
        siteId: page.siteId,
        pageId,
        document: serializedDocument,
        migratedAt: updatedAt,
        updatedAt,
      });
    }
    await ctx.db.patch("pages", pageId, { updatedAt });
    await indexPageContent(ctx, pageId);
    return null;
  },
});
