import type {
  GenericActionCtx,
  GenericMutationCtx,
  GenericQueryCtx,
} from "convex/server";
import { ConvexError, v } from "convex/values";
import { components } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import { internalQuery, query } from "./_generated/server";
import {
  type OrganizationPermission,
  roleHasPermission,
} from "./authComponent/permissions";

type AuthCtx = GenericQueryCtx<DataModel> | GenericMutationCtx<DataModel>;
type ActionAuthCtx = GenericActionCtx<DataModel>;

export type ServerAuthContext = {
  userId: string;
  email?: string;
  name?: string;
  imageUrl?: string;
};

type OrganizationMember = {
  id: string;
  organizationId: string;
  role: string;
  userId: string;
};

type AuthWithMember = {
  auth: ServerAuthContext;
  member: OrganizationMember;
};

async function parseIdentity(ctx: AuthCtx): Promise<ServerAuthContext | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;

  return {
    userId: identity.subject,
    email: identity.email ?? undefined,
    name: identity.name ?? undefined,
    imageUrl: identity.pictureUrl ?? undefined,
  };
}

export async function getAuthContextOrNull(
  ctx: AuthCtx,
): Promise<ServerAuthContext | null> {
  return parseIdentity(ctx);
}

export async function requireUser(ctx: AuthCtx): Promise<ServerAuthContext> {
  const auth = await getAuthContextOrNull(ctx);
  if (!auth) {
    throw new ConvexError({
      code: "UNAUTHENTICATED",
      message: "Authentication required",
    });
  }
  return auth;
}

export async function getActionAuthContextOrNull(
  ctx: ActionAuthCtx,
): Promise<ServerAuthContext | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  return {
    userId: identity.subject,
    email: identity.email ?? undefined,
    name: identity.name ?? undefined,
    imageUrl: identity.pictureUrl ?? undefined,
  };
}

export async function getActionAuthContext(
  ctx: ActionAuthCtx,
): Promise<ServerAuthContext> {
  const auth = await getActionAuthContextOrNull(ctx);
  if (!auth) {
    throw new ConvexError({
      code: "UNAUTHENTICATED",
      message: "Authentication required",
    });
  }
  return auth;
}

async function findOrganizationMember(
  ctx: AuthCtx,
  organizationId: string,
  userId: string,
): Promise<OrganizationMember | null> {
  const record = (await ctx.runQuery(components.betterAuth.adapter.findOne, {
    model: "member",
    where: [
      { field: "organizationId", operator: "eq", value: organizationId },
      { field: "userId", operator: "eq", value: userId },
    ],
  })) as {
    _id: string;
    organizationId: string;
    role: string;
    userId: string;
  } | null;

  return record
    ? {
        id: record._id,
        organizationId: record.organizationId,
        role: record.role,
        userId: record.userId,
      }
    : null;
}

export async function requireOrganizationMember(
  ctx: AuthCtx,
  organizationId: string,
): Promise<AuthWithMember> {
  const auth = await requireUser(ctx);
  const member = await findOrganizationMember(ctx, organizationId, auth.userId);
  if (!member) {
    throw new ConvexError({
      code: "FORBIDDEN",
      message: "Organization membership required",
    });
  }
  return { auth, member };
}

export async function requireOrganizationPermission(
  ctx: AuthCtx,
  organizationId: string,
  permission: OrganizationPermission,
): Promise<AuthWithMember> {
  const result = await requireOrganizationMember(ctx, organizationId);
  if (!roleHasPermission(result.member.role, permission)) {
    throw new ConvexError({
      code: "FORBIDDEN",
      message: "Insufficient organization permission",
    });
  }
  return result;
}

export async function isOrganizationMember(
  ctx: AuthCtx,
  organizationId: string,
): Promise<boolean> {
  const auth = await getAuthContextOrNull(ctx);
  return auth
    ? Boolean(await findOrganizationMember(ctx, organizationId, auth.userId))
    : false;
}

export async function checkOrganizationPermission(
  ctx: AuthCtx,
  organizationId: string,
  permission: OrganizationPermission,
): Promise<boolean> {
  const auth = await getAuthContextOrNull(ctx);
  if (!auth) return false;
  const member = await findOrganizationMember(ctx, organizationId, auth.userId);
  return member ? roleHasPermission(member.role, permission) : false;
}

export const hasOrganizationManagementPermission = (
  ctx: AuthCtx,
  organizationId: string,
) =>
  checkOrganizationPermission(ctx, organizationId, {
    resource: "organization",
    action: "update",
  });

export const getFullAuthContext = query({
  args: {},
  handler: async (ctx) => {
    const auth = await getAuthContextOrNull(ctx);
    if (!auth) {
      return { isAuthenticated: false, hasOrganization: false, user: null };
    }

    const memberships = await ctx.runQuery(
      components.betterAuth.adapter.findMany,
      {
        model: "member",
        where: [{ field: "userId", operator: "eq", value: auth.userId }],
        paginationOpts: { numItems: 1, cursor: null },
      },
    );

    return {
      isAuthenticated: true,
      hasOrganization: Boolean(memberships?.page?.length),
      user: {
        id: auth.userId,
        email: auth.email,
        name: auth.name,
        imageUrl: auth.imageUrl,
      },
    };
  },
});

export const checkSiteMembership = internalQuery({
  args: { siteId: v.id("sites"), userId: v.string() },
  handler: async (ctx, { siteId, userId }) => {
    const site = await ctx.db.get(siteId);
    if (!site) return false;
    return Boolean(
      await findOrganizationMember(ctx, site.organizationId, userId),
    );
  },
});
