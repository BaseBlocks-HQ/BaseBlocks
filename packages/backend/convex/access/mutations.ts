import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { getAuthContext } from "../auth";

function generateToken(): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let token = "";
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

// Create a new access link
export const create = mutation({
  args: {
    siteId: v.id("sites"),
    name: v.optional(v.string()),
    expiresAt: v.optional(v.number()),
    maxUses: v.optional(v.number()),
  },
  handler: async (ctx, { siteId, name, expiresAt, maxUses }) => {
    const auth = await getAuthContext(ctx);

    const site = await ctx.db.get(siteId);
    if (!site) throw new Error("Site not found");

    const company = await ctx.db.get(site.companyId);
    if (!company || company.eaOrgId !== auth.eaOrgId) {
      throw new Error("Unauthorized");
    }

    const token = generateToken();

    const linkId = await ctx.db.insert("accessLinks", {
      siteId,
      token,
      name,
      expiresAt,
      maxUses,
      useCount: 0,
      createdBy: auth.userId,
      createdAt: Date.now(),
    });

    return { linkId, token };
  },
});

// Update access link
export const update = mutation({
  args: {
    linkId: v.id("accessLinks"),
    name: v.optional(v.string()),
    expiresAt: v.optional(v.number()),
    maxUses: v.optional(v.number()),
  },
  handler: async (ctx, { linkId, name, expiresAt, maxUses }) => {
    const auth = await getAuthContext(ctx);

    const link = await ctx.db.get(linkId);
    if (!link) throw new Error("Access link not found");

    const site = await ctx.db.get(link.siteId);
    if (!site) throw new Error("Site not found");

    const company = await ctx.db.get(site.companyId);
    if (!company || company.eaOrgId !== auth.eaOrgId) {
      throw new Error("Unauthorized");
    }

    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name;
    if (expiresAt !== undefined) updates.expiresAt = expiresAt;
    if (maxUses !== undefined) updates.maxUses = maxUses;

    await ctx.db.patch(linkId, updates);
    return linkId;
  },
});

// Delete access link
export const remove = mutation({
  args: { linkId: v.id("accessLinks") },
  handler: async (ctx, { linkId }) => {
    const auth = await getAuthContext(ctx);

    const link = await ctx.db.get(linkId);
    if (!link) throw new Error("Access link not found");

    const site = await ctx.db.get(link.siteId);
    if (!site) throw new Error("Site not found");

    const company = await ctx.db.get(site.companyId);
    if (!company || company.eaOrgId !== auth.eaOrgId) {
      throw new Error("Unauthorized");
    }

    await ctx.db.delete(linkId);
  },
});

// Increment use count and log access
export const recordAccess = mutation({
  args: {
    token: v.string(),
    action: v.union(
      v.literal("view_site"),
      v.literal("view_page"),
      v.literal("download_document"),
    ),
    pageId: v.optional(v.id("pages")),
    documentId: v.optional(v.id("documents")),
    ip: v.optional(v.string()),
    userAgent: v.optional(v.string()),
  },
  handler: async (
    ctx,
    { token, action, pageId, documentId, ip, userAgent },
  ) => {
    const link = await ctx.db
      .query("accessLinks")
      .withIndex("by_token", (q) => q.eq("token", token))
      .first();

    if (!link) {
      throw new Error("Invalid access token");
    }

    // Increment use count
    await ctx.db.patch(link._id, {
      useCount: link.useCount + 1,
    });

    // Log access
    await ctx.db.insert("accessLog", {
      siteId: link.siteId,
      accessLinkId: link._id,
      pageId,
      documentId,
      action,
      ip,
      userAgent,
      timestamp: Date.now(),
    });
  },
});
