/**
 * Member queries - public queries for clients
 */
import { query } from "../_generated/server";
import { v } from "convex/values";
import { getAuthContext, getAuthContextOrNull } from "../auth";

/**
 * List all members for a company
 */
export const list = query({
  args: {
    companyId: v.id("companies"),
  },
  handler: async (ctx, { companyId }) => {
    const auth = await getAuthContext(ctx);

    // Get company and verify access
    const company = await ctx.db.get(companyId);
    if (!company || company.eaOrgId !== auth.eaOrgId) {
      throw new Error("Unauthorized");
    }

    const members = await ctx.db
      .query("members")
      .withIndex("by_company", (q) => q.eq("companyId", companyId))
      .collect();

    return members.map((m) => ({
      _id: m._id,
      eaUserId: m.eaUserId,
      email: m.email,
      name: m.name,
      imageUrl: m.imageUrl,
      role: m.role,
      eaRole: m.eaRole,
      joinedAt: m.joinedAt,
      isOwner: m.eaRole === "owner",
    }));
  },
});

/**
 * Get current user's role for a company
 */
export const getMyRole = query({
  args: {
    companyId: v.id("companies"),
  },
  handler: async (ctx, { companyId }) => {
    const auth = await getAuthContextOrNull(ctx);
    if (!auth) {
      return null;
    }

    const member = await ctx.db
      .query("members")
      .withIndex("by_company_user", (q) =>
        q.eq("companyId", companyId).eq("eaUserId", auth.userId),
      )
      .first();

    if (!member) {
      return null;
    }

    return {
      role: member.role,
      eaRole: member.eaRole,
      isOwner: member.eaRole === "owner",
    };
  },
});

/**
 * Check if current user is admin for a company
 */
export const isAdmin = query({
  args: {
    companyId: v.id("companies"),
  },
  handler: async (ctx, { companyId }) => {
    const auth = await getAuthContextOrNull(ctx);
    if (!auth) {
      return false;
    }

    const member = await ctx.db
      .query("members")
      .withIndex("by_company_user", (q) =>
        q.eq("companyId", companyId).eq("eaUserId", auth.userId),
      )
      .first();

    return member?.role === "admin";
  },
});

/**
 * Check if current user is a member (admin or viewer) for a company
 */
export const isMember = query({
  args: {
    companyId: v.id("companies"),
  },
  handler: async (ctx, { companyId }) => {
    const auth = await getAuthContextOrNull(ctx);
    if (!auth) {
      return false;
    }

    const member = await ctx.db
      .query("members")
      .withIndex("by_company_user", (q) =>
        q.eq("companyId", companyId).eq("eaUserId", auth.userId),
      )
      .first();

    return !!member;
  },
});

/**
 * Get member count for a company
 */
export const count = query({
  args: {
    companyId: v.id("companies"),
  },
  handler: async (ctx, { companyId }) => {
    const auth = await getAuthContext(ctx);

    // Get company and verify access
    const company = await ctx.db.get(companyId);
    if (!company || company.eaOrgId !== auth.eaOrgId) {
      throw new Error("Unauthorized");
    }

    const members = await ctx.db
      .query("members")
      .withIndex("by_company", (q) => q.eq("companyId", companyId))
      .collect();

    return members.length;
  },
});
