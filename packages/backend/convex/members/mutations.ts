/**
 * Member mutations - public mutations for clients
 */
import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { getAuthContext } from "../auth";

/**
 * Update a member's role (admin only)
 * Note: This only updates the local BaseBlocks role, not the Entity Auth role
 */
export const updateRole = mutation({
  args: {
    memberId: v.id("members"),
    role: v.union(v.literal("admin"), v.literal("viewer")),
  },
  handler: async (ctx, { memberId, role }) => {
    const auth = await getAuthContext(ctx);
    if (!auth.eaOrgId) {
      throw new Error("No organization selected");
    }

    // Get the member to update
    const memberToUpdate = await ctx.db.get(memberId);
    if (!memberToUpdate) {
      throw new Error("Member not found");
    }

    // Get the company
    const company = await ctx.db.get(memberToUpdate.companyId);
    if (!company || company.eaOrgId !== auth.eaOrgId) {
      throw new Error("Unauthorized");
    }

    // Verify current user is admin
    const currentMember = await ctx.db
      .query("members")
      .withIndex("by_company_user", (q) =>
        q.eq("companyId", memberToUpdate.companyId).eq("eaUserId", auth.userId),
      )
      .first();

    if (!currentMember || currentMember.role !== "admin") {
      throw new Error("Admin access required");
    }

    // Cannot change the owner's role
    if (memberToUpdate.eaRole === "owner") {
      throw new Error("Cannot change the organization owner's role");
    }

    // Cannot demote yourself if you're the last admin
    if (memberToUpdate.eaUserId === auth.userId && role === "viewer") {
      const admins = await ctx.db
        .query("members")
        .withIndex("by_company", (q) => q.eq("companyId", memberToUpdate.companyId))
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
 * Ensure the company creator is added as an admin member
 * Called during company creation or when no members exist
 */
export const ensureCreatorMember = mutation({
  args: {
    companyId: v.id("companies"),
  },
  handler: async (ctx, { companyId }) => {
    const auth = await getAuthContext(ctx);
    if (!auth.eaOrgId) {
      throw new Error("No organization selected");
    }

    // Get the company
    const company = await ctx.db.get(companyId);
    if (!company || company.eaOrgId !== auth.eaOrgId) {
      throw new Error("Unauthorized");
    }

    // Check if user is already a member
    const existingMember = await ctx.db
      .query("members")
      .withIndex("by_company_user", (q) =>
        q.eq("companyId", companyId).eq("eaUserId", auth.userId),
      )
      .first();

    if (existingMember) {
      return { memberId: existingMember._id, alreadyExists: true };
    }

    // Add as admin member (company creator)
    const now = Date.now();
    const memberId = await ctx.db.insert("members", {
      companyId,
      eaUserId: auth.userId,
      email: auth.email || "",
      name: auth.username,
      imageUrl: auth.imageUrl,
      role: "admin",
      eaRole: "owner", // Company creator is the owner
      joinedAt: now,
      syncedAt: now,
    });

    return { memberId, alreadyExists: false };
  },
});
