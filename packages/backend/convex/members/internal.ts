import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";

/**
 * Get a company by ID
 */
export const getCompany = internalQuery({
  args: { companyId: v.id("companies") },
  handler: async (ctx, { companyId }) => {
    return await ctx.db.get(companyId);
  },
});

/**
 * Get a member by company and user ID
 */
export const getMemberByUserId = internalQuery({
  args: {
    companyId: v.id("companies"),
    userId: v.string(),
  },
  handler: async (ctx, { companyId, userId }) => {
    return await ctx.db
      .query("members")
      .withIndex("by_company_user", (q) =>
        q.eq("companyId", companyId).eq("userId", userId),
      )
      .first();
  },
});

/**
 * Get a member by ID
 */
export const getMemberById = internalQuery({
  args: { memberId: v.id("members") },
  handler: async (ctx, { memberId }) => {
    return await ctx.db.get(memberId);
  },
});

/**
 * Delete a member
 */
export const deleteMember = internalMutation({
  args: { memberId: v.id("members") },
  handler: async (ctx, { memberId }) => {
    await ctx.db.delete(memberId);
  },
});

/**
 * Update member role
 */
export const updateMemberRole = internalMutation({
  args: {
    memberId: v.id("members"),
    role: v.union(v.literal("admin"), v.literal("viewer")),
  },
  handler: async (ctx, { memberId, role }) => {
    await ctx.db.patch(memberId, { role });
  },
});

/**
 * Get company by organization ID (Better Auth)
 */
export const getCompanyByOrganizationId = internalQuery({
  args: { organizationId: v.string() },
  handler: async (ctx, { organizationId }) => {
    return await ctx.db
      .query("companies")
      .withIndex("by_organizationId", (q) =>
        q.eq("organizationId", organizationId),
      )
      .first();
  },
});

/**
 * Add a single member after accepting an invitation
 */
export const addMemberFromInvitation = internalMutation({
  args: {
    companyId: v.id("companies"),
    userId: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    role: v.union(v.literal("admin"), v.literal("viewer")),
  },
  handler: async (
    ctx,
    { companyId, userId, email, name, imageUrl, role },
  ) => {
    const now = Date.now();

    // Check if member already exists
    const existing = await ctx.db
      .query("members")
      .withIndex("by_company_user", (q) =>
        q.eq("companyId", companyId).eq("userId", userId),
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        email,
        name,
        imageUrl,
        role,
      });
      return { memberId: existing._id, action: "updated" as const };
    }

    const memberId = await ctx.db.insert("members", {
      companyId,
      userId,
      email,
      name,
      imageUrl,
      role,
      joinedAt: now,
    });

    return { memberId, action: "created" as const };
  },
});
