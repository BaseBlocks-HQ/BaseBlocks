import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { getAuthContext, requireAdmin } from "../auth";

/**
 * Update a member's role (admin only)
 */
export const updateRole = mutation({
  args: {
    memberId: v.id("members"),
    role: v.union(v.literal("admin"), v.literal("viewer")),
  },
  handler: async (ctx, { memberId, role }) => {
    const memberToUpdate = await ctx.db.get(memberId);
    if (!memberToUpdate) {
      throw new Error("Member not found");
    }

    await requireAdmin(ctx, memberToUpdate.companyId);

    // Cannot demote yourself if you're the last admin
    const auth = await getAuthContext(ctx);
    if (memberToUpdate.userId === auth.userId && role === "viewer") {
      const admins = await ctx.db
        .query("members")
        .withIndex("by_company", (q) =>
          q.eq("companyId", memberToUpdate.companyId),
        )
        .filter((q) => q.eq(q.field("role"), "admin"))
        .collect();

      if (admins.length <= 1) {
        throw new Error("Cannot remove the last admin");
      }
    }

    await ctx.db.patch(memberId, { role });
    return { success: true };
  },
});

/**
 * Delete the current user's account data from all companies
 */
export const deleteMyAccountData = mutation({
  args: {},
  handler: async (ctx) => {
    const auth = await getAuthContext(ctx);

    const memberRecords = await ctx.db
      .query("members")
      .withIndex("by_user", (q) => q.eq("userId", auth.userId))
      .collect();

    for (const member of memberRecords) {
      await ctx.db.delete(member._id);
    }

    return { success: true, deletedMemberRecords: memberRecords.length };
  },
});

/**
 * Ensure the company creator is added as an admin member
 */
export const ensureCreatorMember = mutation({
  args: {
    companyId: v.id("companies"),
  },
  handler: async (ctx, { companyId }) => {
    const auth = await getAuthContext(ctx);

    const company = await ctx.db.get(companyId);
    if (!company) {
      throw new Error("Company not found");
    }

    // Check if user is already a member
    const existingMember = await ctx.db
      .query("members")
      .withIndex("by_company_user", (q) =>
        q.eq("companyId", companyId).eq("userId", auth.userId),
      )
      .first();

    if (existingMember) {
      return { memberId: existingMember._id, alreadyExists: true };
    }

    const now = Date.now();
    const memberId = await ctx.db.insert("members", {
      companyId,
      userId: auth.userId,
      email: auth.email || "",
      name: auth.name,
      imageUrl: auth.imageUrl,
      role: "admin",
      joinedAt: now,
    });

    return { memberId, alreadyExists: false };
  },
});

/**
 * Sync a member record after accepting a Better Auth invitation.
 * Maps BA roles to Convex roles ("member" → "viewer", "admin" → "admin").
 */
export const syncMemberFromInvitation = mutation({
  args: {
    organizationId: v.string(),
    role: v.string(),
  },
  handler: async (ctx, { organizationId, role }) => {
    const auth = await getAuthContext(ctx);

    // Find the Convex company linked to this BA organization
    const company = await ctx.db
      .query("companies")
      .withIndex("by_organizationId", (q) =>
        q.eq("organizationId", organizationId),
      )
      .first();

    if (!company) {
      throw new Error("Company not found for this organization");
    }

    // Check if already a member
    const existing = await ctx.db
      .query("members")
      .withIndex("by_company_user", (q) =>
        q.eq("companyId", company._id).eq("userId", auth.userId),
      )
      .first();

    if (existing) {
      return { memberId: existing._id, alreadyExists: true };
    }

    // Map BA role to Convex role
    const convexRole: "admin" | "viewer" = role === "admin" ? "admin" : "viewer";

    const memberId = await ctx.db.insert("members", {
      companyId: company._id,
      userId: auth.userId,
      email: auth.email || "",
      name: auth.name,
      imageUrl: auth.imageUrl,
      role: convexRole,
      joinedAt: Date.now(),
    });

    return { memberId, alreadyExists: false };
  },
});

/**
 * Remove a member from the organization (admin only)
 */
export const removeMember = mutation({
  args: {
    companyId: v.id("companies"),
    memberId: v.id("members"),
  },
  handler: async (ctx, { companyId, memberId }) => {
    const { auth } = await requireAdmin(ctx, companyId);

    const memberToRemove = await ctx.db.get(memberId);
    if (!memberToRemove) {
      throw new Error("Member not found");
    }

    if (memberToRemove.companyId !== companyId) {
      throw new Error("Member does not belong to this company");
    }

    if (memberToRemove.userId === auth.userId) {
      throw new Error("Cannot remove yourself from the organization");
    }

    await ctx.db.delete(memberId);
    return { success: true };
  },
});
