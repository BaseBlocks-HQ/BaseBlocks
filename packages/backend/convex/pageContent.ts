import { ConvexError, getConvexSize, v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import {
  internalMutation,
  mutation,
  query,
  type MutationCtx,
} from "./_generated/server";
import { readPageContent, getPageDocument } from "./model/pageDocuments";
import {
  contentObjectReferences,
  getOrCreateContentObject,
} from "./model/contentObjects";
import {
  extractOpenEditorReferences,
  hashOpenEditorContent,
  parseOpenEditorDocument,
  type OpenEditorDocument,
} from "./pageContentFormat";
import {
  isOrganizationMember,
  requireOrganizationPermission,
} from "./permissions";
import { indexPageContent, queuePageContentIndex } from "./search";
import { touchSiteDraft } from "./model/draft";

const MAX_PAGE_CONTENT_BYTES = 900_000;

function referenceValue(
  ctx: Pick<MutationCtx, "db">,
  pageId: Id<"pages">,
  siteId: Id<"sites">,
  content: OpenEditorDocument,
  updatedAt: number,
) {
  const references = extractOpenEditorReferences(content);
  const libraryIds = Array.from(references.libraryIds)
    .flatMap((id) => {
      const normalized = ctx.db.normalizeId("documentLibraries", id);
      return normalized ? [normalized] : [];
    })
    .sort();
  const fileIds = Array.from(references.fileIds)
    .flatMap((id) => {
      const normalized = ctx.db.normalizeId("files", id);
      return normalized ? [normalized] : [];
    })
    .sort();
  return {
    key: `${libraryIds.join(",")}|${fileIds.join(",")}`,
    value: { siteId, pageId, libraryIds, fileIds, updatedAt },
  };
}

async function writePageReferences(
  ctx: Pick<MutationCtx, "db">,
  value: ReturnType<typeof referenceValue>["value"],
) {
  const existing = await ctx.db
    .query("pageReferences")
    .withIndex("by_page", (q) => q.eq("pageId", value.pageId))
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
    const page = await ctx.db.get(pageId);
    if (!page || page.deletedAt !== undefined) return null;
    const site = await ctx.db.get(page.siteId);
    if (!site || !(await isOrganizationMember(ctx, site.organizationId))) {
      return null;
    }
    return (await readPageContent(ctx, pageId)).document;
  },
});

// Temporary drain target for jobs scheduled by the pre-refactor deployment.
export const indexIfCurrent = internalMutation({
  args: { pageId: v.id("pages"), contentHash: v.string() },
  returns: v.null(),
  handler: async (ctx, { pageId, contentHash }) => {
    const current = await getPageDocument(ctx, pageId);
    if (!current || current.contentHash !== contentHash) return null;
    await indexPageContent(
      ctx,
      pageId,
      (await readPageContent(ctx, pageId)).document,
    );
    return null;
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
    const contentObject = await getOrCreateContentObject(ctx, {
      siteId: page.siteId,
      content: serializedDocument,
      contentHash,
      contentSize,
      document: parsedDocument,
      createdAt: updatedAt,
    });
    const revisionId = contentObject.revisionId;
    const storedReferences = contentObjectReferences(contentObject);
    const references = {
      key: storedReferences.key,
      value: {
        siteId: page.siteId,
        pageId,
        libraryIds: storedReferences.libraryIds,
        fileIds: storedReferences.fileIds,
        updatedAt,
      },
    };
    if (existing) {
      await ctx.db.patch(existing._id, {
        revisionId,
        blobId: undefined,
        contentHash,
        contentSize,
        referencesKey: references.key,
        updatedAt,
      });
    } else {
      await ctx.db.insert("pageDocuments", {
        siteId: page.siteId,
        pageId,
        revisionId,
        contentHash,
        contentSize,
        referencesKey: references.key,
        updatedAt,
      });
    }
    await touchSiteDraft(ctx, page.siteId, updatedAt, [
      { entityType: "page", entityId: pageId },
    ]);

    if (existing?.referencesKey !== references.key) {
      await writePageReferences(ctx, references.value);
    }
    await queuePageContentIndex(ctx, pageId, revisionId, contentHash);
    return contentHash;
  },
});
