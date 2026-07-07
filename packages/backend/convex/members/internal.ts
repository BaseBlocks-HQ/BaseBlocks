import { teamRoles } from "@baseblocks/domain";
import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";

/**
 * Get a team by ID
 */
export const getTeam = internalQuery({
  args: { teamId: v.id("teams") },
  handler: async (ctx, { teamId }) => {
    return await ctx.db.get(teamId);
  },
});

/**
 * Get a member by team and user ID
 */
export const getMemberByUserId = internalQuery({
  args: {
    teamId: v.id("teams"),
    userId: v.string(),
  },
  handler: async (ctx, { teamId, userId }) => {
    return await ctx.db
      .query("members")
      .withIndex("by_team_user", (q) =>
        q.eq("teamId", teamId).eq("userId", userId),
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
    role: v.union(...teamRoles.map((role) => v.literal(role))),
  },
  handler: async (ctx, { memberId, role }) => {
    await ctx.db.patch(memberId, { role });
  },
});

/**
 * Get team by organization ID (Better Auth)
 */
export const getTeamByOrganizationId = internalQuery({
  args: { organizationId: v.string() },
  handler: async (ctx, { organizationId }) => {
    return await ctx.db
      .query("teams")
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
    teamId: v.id("teams"),
    userId: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    role: v.union(...teamRoles.map((role) => v.literal(role))),
  },
  handler: async (ctx, { teamId, userId, email, name, imageUrl, role }) => {
    const now = Date.now();

    // Check if member already exists
    const existing = await ctx.db
      .query("members")
      .withIndex("by_team_user", (q) =>
        q.eq("teamId", teamId).eq("userId", userId),
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
      teamId,
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
