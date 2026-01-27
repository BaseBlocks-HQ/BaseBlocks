import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { getAuthContext } from "../auth";

// Create document record (after upload to Entity Storage)
export const create = mutation({
  args: {
    siteId: v.id("sites"),
    blobId: v.string(),
    cdnUrl: v.string(),
    filename: v.string(),
    contentType: v.string(),
    size: v.number(),
  },
  handler: async (ctx, { siteId, blobId, cdnUrl, filename, contentType, size }) => {
    const auth = await getAuthContext(ctx);

    const site = await ctx.db.get(siteId);
    if (!site) throw new Error("Site not found");

    const company = await ctx.db.get(site.companyId);
    if (!company || company.eaOrgId !== auth.eaOrgId) {
      throw new Error("Unauthorized");
    }

    const documentId = await ctx.db.insert("documents", {
      siteId,
      blobId,
      cdnUrl,
      filename,
      contentType,
      size,
      uploadedBy: auth.userId,
      createdAt: Date.now(),
    });

    return documentId;
  },
});

// Update document metadata (e.g., after text extraction)
export const updateMetadata = mutation({
  args: {
    documentId: v.id("documents"),
    extractedText: v.optional(v.string()),
    pageCount: v.optional(v.number()),
  },
  handler: async (ctx, { documentId, extractedText, pageCount }) => {
    const auth = await getAuthContext(ctx);

    const document = await ctx.db.get(documentId);
    if (!document) throw new Error("Document not found");

    const site = await ctx.db.get(document.siteId);
    if (!site) throw new Error("Site not found");

    const company = await ctx.db.get(site.companyId);
    if (!company || company.eaOrgId !== auth.eaOrgId) {
      throw new Error("Unauthorized");
    }

    const updates: Record<string, unknown> = {};
    if (extractedText !== undefined) updates.extractedText = extractedText;
    if (pageCount !== undefined) updates.pageCount = pageCount;

    await ctx.db.patch(documentId, updates);
    return documentId;
  },
});

// Delete document
export const remove = mutation({
  args: { documentId: v.id("documents") },
  handler: async (ctx, { documentId }) => {
    const auth = await getAuthContext(ctx);

    const document = await ctx.db.get(documentId);
    if (!document) throw new Error("Document not found");

    const site = await ctx.db.get(document.siteId);
    if (!site) throw new Error("Site not found");

    const company = await ctx.db.get(site.companyId);
    if (!company || company.eaOrgId !== auth.eaOrgId) {
      throw new Error("Unauthorized");
    }

    await ctx.db.delete(documentId);
  },
});
