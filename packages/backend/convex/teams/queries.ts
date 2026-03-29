import type { GenericQueryCtx } from "convex/server";
import { v } from "convex/values";
import { components } from "../_generated/api";
import type { DataModel } from "../_generated/dataModel";
import { query } from "../_generated/server";
import { getAuthContextOrNull } from "../auth";

async function getWorkspaceTeams(
  ctx: GenericQueryCtx<DataModel>,
  userId: string,
) {
  const memberships = await ctx.db
    .query("members")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();

  if (memberships.length === 0) {
    return [];
  }

  memberships.sort((a, b) => b.joinedAt - a.joinedAt);

  const teams = await Promise.all(
    memberships.map(async (membership) => {
      const team = await ctx.db.get(membership.teamId);
      if (!team) return null;
      return {
        ...team,
        memberRole: membership.role,
        joinedAt: membership.joinedAt,
      };
    }),
  );

  return teams.filter((team): team is NonNullable<typeof team> => team !== null);
}

async function getActiveOrganizationId(
  ctx: GenericQueryCtx<DataModel>,
): Promise<string | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity?.sessionId) {
    return null;
  }

  const session = (await ctx.runQuery(components.betterAuth.adapter.findOne, {
    model: "session",
    where: [
      {
        field: "_id",
        value: identity.sessionId as string,
      },
      {
        field: "expiresAt",
        operator: "gt",
        value: Date.now(),
      },
    ],
  })) as { activeOrganizationId?: string | null } | null;

  return session?.activeOrganizationId ?? null;
}

export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const team = await ctx.db
      .query("teams")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();
    if (!team) return null;
    // Project only public fields — exclude organizationId and createdBy
    return {
      _id: team._id,
      _creationTime: team._creationTime,
      name: team.name,
      slug: team.slug,
      logoUrl: team.logoUrl,
      settings: team.settings,
    };
  },
});

export const getWorkspaceBoundary = query({
  args: {
    teamSlug: v.optional(v.string()),
  },
  handler: async (ctx, { teamSlug }) => {
    const auth = await getAuthContextOrNull(ctx);
    if (!auth) {
      return {
        activeWorkspace: null,
        requestedWorkspace: null,
        teams: [],
      };
    }

    const teams = await getWorkspaceTeams(ctx, auth.userId);
    if (teams.length === 0) {
      return {
        activeWorkspace: null,
        requestedWorkspace: null,
        teams: [],
      };
    }

    const activeOrganizationId = await getActiveOrganizationId(ctx);
    const activeWorkspace =
      teams.find((team) => team.organizationId === activeOrganizationId) ??
      teams[0] ??
      null;

    const requestedWorkspace = teamSlug
      ? teams.find((team) => team.slug === teamSlug) ?? null
      : null;

    return {
      activeWorkspace,
      requestedWorkspace,
      teams,
    };
  },
});

export const isSlugAvailable = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const existing = await ctx.db
      .query("teams")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();
    return !existing;
  },
});
