import { v } from "convex/values";
import { components } from "../_generated/api";
import { query } from "../_generated/server";
import { checkIsMember, getAuthContextOrNull } from "../auth";
import { mergeMemberProfiles } from "./profileMerge";

/**
 * List all members for a team
 */
export const list = query({
  args: {
    teamId: v.id("teams"),
  },
  handler: async (ctx, { teamId }) => {
    if (!(await checkIsMember(ctx, teamId))) return [];

    const members = await ctx.db
      .query("members")
      .withIndex("by_team", (q) => q.eq("teamId", teamId))
      .collect();

    const memberSnapshots = members.map((m) => ({
      _id: m._id,
      userId: m.userId,
      email: m.email,
      name: m.name,
      imageUrl: m.imageUrl,
      role: m.role,
      joinedAt: m.joinedAt,
    }));

    if (memberSnapshots.length === 0) {
      return memberSnapshots;
    }

    const authUsersResult = await ctx.runQuery(
      components.betterAuth.adapter.findMany,
      {
        model: "user",
        where: [
          {
            field: "_id",
            operator: "in",
            value: memberSnapshots.map((member) => member.userId),
          },
        ],
        paginationOpts: {
          numItems: memberSnapshots.length,
          cursor: null,
        },
      },
    );

    const authUsers =
      authUsersResult && "page" in authUsersResult
        ? (authUsersResult.page as {
            _id: string;
            email: string;
            image?: string | null;
            name: string;
          }[])
        : [];

    return mergeMemberProfiles(memberSnapshots, authUsers);
  },
});

/**
 * Get current user's role for a team
 */
export const getMyRole = query({
  args: {
    teamId: v.id("teams"),
  },
  handler: async (ctx, { teamId }) => {
    const auth = await getAuthContextOrNull(ctx);
    if (!auth) {
      return null;
    }

    const member = await ctx.db
      .query("members")
      .withIndex("by_team_user", (q) =>
        q.eq("teamId", teamId).eq("userId", auth.userId),
      )
      .first();

    if (!member) {
      return null;
    }

    return {
      role: member.role,
    };
  },
});

/**
 * Check if current user is admin for a team
 */
export const isAdmin = query({
  args: {
    teamId: v.id("teams"),
  },
  handler: async (ctx, { teamId }) => {
    const auth = await getAuthContextOrNull(ctx);
    if (!auth) {
      return false;
    }

    const member = await ctx.db
      .query("members")
      .withIndex("by_team_user", (q) =>
        q.eq("teamId", teamId).eq("userId", auth.userId),
      )
      .first();

    return member?.role === "admin";
  },
});

export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const auth = await getAuthContextOrNull(ctx);
    if (!auth) return [];

    const memberships = await ctx.db
      .query("members")
      .withIndex("by_user", (q) => q.eq("userId", auth.userId))
      .collect();

    memberships.sort((a, b) => b.joinedAt - a.joinedAt);

    return memberships.map((membership) => ({
      _id: membership._id,
      teamId: membership.teamId,
      role: membership.role,
      joinedAt: membership.joinedAt,
    }));
  },
});

/**
 * Check if current user is a member (admin or viewer) for a team
 */
export const isMember = query({
  args: {
    teamId: v.id("teams"),
  },
  handler: async (ctx, { teamId }) => {
    const auth = await getAuthContextOrNull(ctx);
    if (!auth) {
      return false;
    }

    const member = await ctx.db
      .query("members")
      .withIndex("by_team_user", (q) =>
        q.eq("teamId", teamId).eq("userId", auth.userId),
      )
      .first();

    return !!member;
  },
});

/**
 * Get member count for a team
 */
export const count = query({
  args: {
    teamId: v.id("teams"),
  },
  handler: async (ctx, { teamId }) => {
    if (!(await checkIsMember(ctx, teamId))) return null;

    const members = await ctx.db
      .query("members")
      .withIndex("by_team", (q) => q.eq("teamId", teamId))
      .collect();

    return members.length;
  },
});
