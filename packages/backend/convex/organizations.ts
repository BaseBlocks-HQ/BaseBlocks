import { v } from "convex/values";
import { components } from "./_generated/api";
import { query } from "./_generated/server";
import {
  type AuthMember,
  type AuthUser,
  authPage,
  getAuthOrganizationById,
} from "./authComponent/model";
import { getAuthContextOrNull, requireOrganizationMember } from "./permissions";

export const getViewerState = query({
  args: { teamSlug: v.optional(v.string()) },
  handler: async (ctx, { teamSlug }) => {
    const auth = await getAuthContextOrNull(ctx);
    if (!auth) {
      return {
        team: null,
        teams: [],
        user: null,
      };
    }

    const membershipResult = await ctx.runQuery(
      components.betterAuth.adapter.findMany,
      {
        model: "member",
        where: [{ field: "userId", operator: "eq", value: auth.userId }],
        paginationOpts: { numItems: 100, cursor: null },
      },
    );
    const memberships = authPage<AuthMember>(membershipResult).sort(
      (a, b) => b.createdAt - a.createdAt,
    );

    const organizations = await Promise.all(
      memberships.map(async (membership) => {
        const organization = await getAuthOrganizationById(
          ctx,
          membership.organizationId,
        );
        if (!organization?.slug) return null;
        return {
          _id: organization._id,
          joinedAt: membership.createdAt,
          logoUrl: organization.logo ?? undefined,
          memberRole: membership.role,
          name: organization.name,
          slug: organization.slug,
        };
      }),
    );
    const teams = organizations.filter(
      (organization): organization is NonNullable<typeof organization> =>
        organization !== null,
    );
    const team = teamSlug
      ? (teams.find((candidate) => candidate.slug === teamSlug) ?? null)
      : (teams[0] ?? null);

    return {
      team,
      teams,
      user: {
        email: auth.email ?? null,
        id: auth.userId,
        imageUrl: auth.imageUrl ?? null,
        name: auth.name ?? null,
      },
    };
  },
});

export const listMembers = query({
  args: { organizationId: v.string() },
  handler: async (ctx, { organizationId }) => {
    await requireOrganizationMember(ctx, organizationId);
    const memberResult = await ctx.runQuery(
      components.betterAuth.adapter.findMany,
      {
        model: "member",
        where: [
          { field: "organizationId", operator: "eq", value: organizationId },
        ],
        paginationOpts: { numItems: 250, cursor: null },
      },
    );
    const members = authPage<AuthMember>(memberResult);
    if (members.length === 0) return [];

    const userResult = await ctx.runQuery(
      components.betterAuth.adapter.findMany,
      {
        model: "user",
        where: [
          {
            field: "_id",
            operator: "in",
            value: members.map((member) => member.userId),
          },
        ],
        paginationOpts: { numItems: members.length, cursor: null },
      },
    );
    const usersById = new Map(
      authPage<AuthUser>(userResult).map((user) => [user._id, user]),
    );

    return members.map((member) => {
      const user = usersById.get(member.userId);
      return {
        _id: member._id,
        userId: member.userId,
        email: user?.email ?? "",
        name: user?.name,
        imageUrl: user?.image ?? undefined,
        role: member.role as "owner" | "admin" | "editor" | "viewer",
        joinedAt: member.createdAt,
      };
    });
  },
});
