import { ConvexError, getConvexSize, v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import {
  internalMutation,
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import {
  emptyOpenEditorDocument,
  extractOpenEditorReferences,
  type OpenEditorDocument,
  parseOpenEditorDocument,
} from "./pageContentFormat";
import {
  isOrganizationMember,
  requireOrganizationPermission,
} from "./permissions";
import { indexPageContent } from "./search";

const MAX_PAGE_CONTENT_BYTES = 900_000;

async function getContent(ctx: Pick<QueryCtx, "db">, pageId: Id<"pages">) {
  const content = await ctx.db
    .query("pageContents")
    .withIndex("by_page", (q) => q.eq("pageId", pageId))
    .unique();
  return content
    ? parseOpenEditorDocument(content.content)
    : emptyOpenEditorDocument();
}

async function indexPageReferences(
  ctx: Pick<MutationCtx, "db">,
  pageId: Id<"pages">,
  siteId: Id<"sites">,
  content: OpenEditorDocument,
  updatedAt: number,
) {
  const references = extractOpenEditorReferences(content);
  const value = {
    siteId,
    pageId,
    libraryIds: Array.from(references.libraryIds).flatMap((id) => {
      const normalized = ctx.db.normalizeId("documentLibraries", id);
      return normalized ? [normalized] : [];
    }),
    fileIds: Array.from(references.fileIds).flatMap((id) => {
      const normalized = ctx.db.normalizeId("files", id);
      return normalized ? [normalized] : [];
    }),
    updatedAt,
  };
  const existing = await ctx.db
    .query("pageReferences")
    .withIndex("by_page", (q) => q.eq("pageId", pageId))
    .unique();
  if (existing) {
    await ctx.db.patch(existing._id, value);
  } else {
    await ctx.db.insert("pageReferences", value);
  }
}

export const get = query({
  args: { pageId: v.id("pages") },
  returns: v.any(),
  handler: async (ctx, { pageId }) => {
    const page = await ctx.db.get("pages", pageId);
    if (!page) return emptyOpenEditorDocument();
    const site = await ctx.db.get("sites", page.siteId);
    if (!site || !(await isOrganizationMember(ctx, site.organizationId))) {
      return emptyOpenEditorDocument();
    }
    return getContent(ctx, pageId);
  },
});

export const save = mutation({
  args: { pageId: v.id("pages"), content: v.any() },
  returns: v.null(),
  handler: async (ctx, { pageId, content }) => {
    const page = await ctx.db.get("pages", pageId);
    if (!page) throw new ConvexError("Page not found");
    const site = await ctx.db.get("sites", page.siteId);
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
    if (getConvexSize(serializedDocument) > MAX_PAGE_CONTENT_BYTES) {
      throw new ConvexError(
        "This page is too large. Split it into child pages.",
      );
    }
    const existing = await ctx.db
      .query("pageContents")
      .withIndex("by_page", (q) => q.eq("pageId", pageId))
      .unique();
    const updatedAt = Date.now();
    if (existing) {
      await ctx.db.patch("pageContents", existing._id, {
        content: serializedDocument,
        updatedAt,
      });
    } else {
      await ctx.db.insert("pageContents", {
        siteId: page.siteId,
        pageId,
        content: serializedDocument,
        updatedAt,
      });
    }
    await ctx.db.patch("pages", pageId, { updatedAt });
    await indexPageReferences(
      ctx,
      pageId,
      page.siteId,
      parsedDocument,
      updatedAt,
    );
    await indexPageContent(ctx, pageId, parsedDocument);
    return null;
  },
});

export const backfillReferences = internalMutation({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const contents = await ctx.db.query("pageContents").collect();
    for (const content of contents) {
      await indexPageReferences(
        ctx,
        content.pageId,
        content.siteId,
        parseOpenEditorDocument(content.content),
        content.updatedAt,
      );
    }
    return contents.length;
  },
});
