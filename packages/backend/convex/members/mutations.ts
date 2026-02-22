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

    await requireAdmin(ctx, memberToUpdate.teamId);

    // Cannot demote yourself if you're the last admin
    const auth = await getAuthContext(ctx);
    if (memberToUpdate.userId === auth.userId && role === "viewer") {
      const admins = await ctx.db
        .query("members")
        .withIndex("by_team", (q) => q.eq("teamId", memberToUpdate.teamId))
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
 * Delete the current user's account data from all teams
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
 * Ensure the team creator is added as an admin member
 */
export const ensureCreatorMember = mutation({
  args: {
    teamId: v.id("teams"),
  },
  handler: async (ctx, { teamId }) => {
    const auth = await getAuthContext(ctx);

    const team = await ctx.db.get(teamId);
    if (!team) {
      throw new Error("Team not found");
    }

    // Only the team creator can use this mutation
    if (team.createdBy !== auth.userId) {
      throw new Error("Only the team creator can use this operation");
    }

    // Check if user is already a member
    const existingMember = await ctx.db
      .query("members")
      .withIndex("by_team_user", (q) =>
        q.eq("teamId", teamId).eq("userId", auth.userId),
      )
      .first();

    if (existingMember) {
      return { memberId: existingMember._id, alreadyExists: true };
    }

    const now = Date.now();
    const memberId = await ctx.db.insert("members", {
      teamId,
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

    // Find the Convex team linked to this BA organization
    const team = await ctx.db
      .query("teams")
      .withIndex("by_organizationId", (q) =>
        q.eq("organizationId", organizationId),
      )
      .first();

    if (!team) {
      throw new Error("Team not found for this organization");
    }

    // Check if already a member
    const existing = await ctx.db
      .query("members")
      .withIndex("by_team_user", (q) =>
        q.eq("teamId", team._id).eq("userId", auth.userId),
      )
      .first();

    if (existing) {
      return { memberId: existing._id, alreadyExists: true };
    }

    // Map BA role to Convex role
    const convexRole: "admin" | "viewer" =
      role === "admin" ? "admin" : "viewer";

    const memberId = await ctx.db.insert("members", {
      teamId: team._id,
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
    teamId: v.id("teams"),
    memberId: v.id("members"),
  },
  handler: async (ctx, { teamId, memberId }) => {
    const { auth } = await requireAdmin(ctx, teamId);

    const memberToRemove = await ctx.db.get(memberId);
    if (!memberToRemove) {
      throw new Error("Member not found");
    }

    if (memberToRemove.teamId !== teamId) {
      throw new Error("Member does not belong to this team");
    }

    if (memberToRemove.userId === auth.userId) {
      throw new Error("Cannot remove yourself from the organization");
    }

    await ctx.db.delete(memberId);
    return { success: true };
  },
});
