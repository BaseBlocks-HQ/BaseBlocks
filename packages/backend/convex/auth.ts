import type {
  GenericActionCtx,
  GenericMutationCtx,
  GenericQueryCtx,
} from "convex/server";
import { ConvexError } from "convex/values";
import type { DataModel, Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";

type AuthCtx = GenericQueryCtx<DataModel> | GenericMutationCtx<DataModel>;
type ActionAuthCtx = GenericActionCtx<DataModel>;

export type ServerAuthContext = {
  userId: string;
  email?: string;
  username?: string;
  imageUrl?: string;
  eaOrgId: string | null;
};

type ParsedIdentity = {
  sub: string;
  oid: string | null;
  email?: string;
  username?: string;
  imageUrl?: string;
};

async function parseIdentity(ctx: AuthCtx): Promise<ParsedIdentity | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;

  const id = identity as unknown as {
    subject?: string;
    sub?: string;
    oid?: string | null;
    email?: string;
    username?: string;
    name?: string;
    imageUrl?: string;
    pictureUrl?: string;
  };

  return {
    sub: String(id.sub || id.subject || ""),
    oid: id.oid ?? null,
    email: id.email,
    username: id.username || id.name,
    imageUrl: id.imageUrl || id.pictureUrl,
  };
}

export async function getAuthContextOrNull(
  ctx: AuthCtx,
): Promise<ServerAuthContext | null> {
  const parsed = await parseIdentity(ctx);
  if (!parsed) return null;

  return {
    userId: parsed.sub,
    email: parsed.email,
    username: parsed.username,
    imageUrl: parsed.imageUrl,
    eaOrgId: parsed.oid,
  };
}

// Alias for backwards compatibility
export const getOptionalAuthContext = getAuthContextOrNull;

async function requireAuthContext(ctx: AuthCtx): Promise<ServerAuthContext> {
  const auth = await getAuthContextOrNull(ctx);
  if (!auth) {
    throw new ConvexError("Not authenticated");
  }
  return auth;
}

export const getServerAuthContext = (
  ctx: AuthCtx,
): Promise<ServerAuthContext> => requireAuthContext(ctx);

// Alias for backwards compatibility
export const getAuthContext = getServerAuthContext;

async function parseIdentityFromAction(
  ctx: ActionAuthCtx,
): Promise<ParsedIdentity | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;

  const id = identity as unknown as {
    subject?: string;
    sub?: string;
    oid?: string | null;
    email?: string;
    username?: string;
    name?: string;
    imageUrl?: string;
    pictureUrl?: string;
  };

  return {
    sub: String(id.sub || id.subject || ""),
    oid: id.oid ?? null,
    email: id.email,
    username: id.username || id.name,
    imageUrl: id.imageUrl || id.pictureUrl,
  };
}

export async function getActionAuthContextOrNull(
  ctx: ActionAuthCtx,
): Promise<ServerAuthContext | null> {
  const parsed = await parseIdentityFromAction(ctx);
  if (!parsed) return null;

  return {
    userId: parsed.sub,
    email: parsed.email,
    username: parsed.username,
    imageUrl: parsed.imageUrl,
    eaOrgId: parsed.oid,
  };
}

async function requireActionAuthContext(
  ctx: ActionAuthCtx,
): Promise<ServerAuthContext> {
  const auth = await getActionAuthContextOrNull(ctx);
  if (!auth) {
    throw new ConvexError("Not authenticated");
  }
  return auth;
}

export const getActionAuthContext = (
  ctx: ActionAuthCtx,
): Promise<ServerAuthContext> => requireActionAuthContext(ctx);

// Query to get the current user's auth context (for client-side use)
export const getFullAuthContext = query({
  args: {},
  handler: async (ctx) => {
    const auth = await getAuthContextOrNull(ctx);

    if (!auth) {
      return {
        isAuthenticated: false,
        hasOrganization: false,
        user: null,
        eaOrgId: null,
      };
    }

    return {
      isAuthenticated: true,
      hasOrganization: Boolean(auth.eaOrgId),
      user: {
        id: auth.userId,
        email: auth.email,
        username: auth.username,
        imageUrl: auth.imageUrl,
      },
      eaOrgId: auth.eaOrgId,
    };
  },
});

// Bootstrap mutation to verify auth state
export const bootstrap = mutation({
  args: {},
  handler: async (ctx) => {
    const auth = await getAuthContextOrNull(ctx);

    if (!auth) {
      throw new ConvexError("Not authenticated");
    }

    return { ok: true, userId: auth.userId };
  },
});

// Role-based authorization helpers

type MemberInfo = {
  _id: Id<"members">;
  role: "admin" | "viewer";
  eaRole: string;
  eaUserId: string;
};

type AuthWithMember = {
  auth: ServerAuthContext;
  member: MemberInfo;
};

/**
 * Get member from members table
 */
async function getMemberByUserId(
  ctx: AuthCtx,
  companyId: Id<"companies">,
  userId: string,
): Promise<MemberInfo | null> {
  const member = await ctx.db
    .query("members")
    .withIndex("by_company_user", (q) =>
      q.eq("companyId", companyId).eq("eaUserId", userId),
    )
    .first();

  if (!member) return null;

  return {
    _id: member._id,
    role: member.role,
    eaRole: member.eaRole,
    eaUserId: member.eaUserId,
  };
}

/**
 * Require user to be an admin of the company
 * Throws if not authenticated or not an admin
 */
export async function requireAdmin(
  ctx: AuthCtx,
  companyId: Id<"companies">,
): Promise<AuthWithMember> {
  const auth = await requireAuthContext(ctx);
  const member = await getMemberByUserId(ctx, companyId, auth.userId);

  if (!member) {
    throw new ConvexError("Not a member of this organization");
  }

  if (member.role !== "admin") {
    throw new ConvexError("Admin access required");
  }

  return { auth, member };
}

/**
 * Require user to be a member of the company (admin or viewer)
 * Throws if not authenticated or not a member
 */
export async function requireMember(
  ctx: AuthCtx,
  companyId: Id<"companies">,
): Promise<AuthWithMember> {
  const auth = await requireAuthContext(ctx);
  const member = await getMemberByUserId(ctx, companyId, auth.userId);

  if (!member) {
    throw new ConvexError("Not a member of this organization");
  }

  return { auth, member };
}

/**
 * Check if user is an admin (returns boolean, doesn't throw)
 */
export async function checkIsAdmin(
  ctx: AuthCtx,
  companyId: Id<"companies">,
): Promise<boolean> {
  const auth = await getAuthContextOrNull(ctx);
  if (!auth) return false;

  const member = await getMemberByUserId(ctx, companyId, auth.userId);
  return member?.role === "admin";
}

/**
 * Check if user is a member (returns boolean, doesn't throw)
 */
export async function checkIsMember(
  ctx: AuthCtx,
  companyId: Id<"companies">,
): Promise<boolean> {
  const auth = await getAuthContextOrNull(ctx);
  if (!auth) return false;

  const member = await getMemberByUserId(ctx, companyId, auth.userId);
  return !!member;
}

/**
 * Require org access via eaOrgId (legacy check) OR member table
 * This is a transitional helper during migration to member-based auth
 */
export async function requireOrgAccessOrMember(
  ctx: AuthCtx,
  companyId: Id<"companies">,
): Promise<{ auth: ServerAuthContext; isMember: boolean }> {
  const auth = await requireAuthContext(ctx);

  // First check the members table
  const member = await getMemberByUserId(ctx, companyId, auth.userId);
  if (member) {
    return { auth, isMember: true };
  }

  // Fallback to eaOrgId check (legacy)
  const company = await ctx.db.get(companyId);
  if (company && company.eaOrgId === auth.eaOrgId) {
    return { auth, isMember: false };
  }

  throw new ConvexError("Not authorized to access this organization");
}

/**
 * Require admin access via member table OR legacy eaOrgId (for writes)
 * This is a transitional helper during migration
 */
export async function requireAdminOrLegacy(
  ctx: AuthCtx,
  companyId: Id<"companies">,
): Promise<{ auth: ServerAuthContext; isAdmin: boolean }> {
  const auth = await requireAuthContext(ctx);

  // First check the members table
  const member = await getMemberByUserId(ctx, companyId, auth.userId);
  if (member) {
    if (member.role !== "admin") {
      throw new ConvexError("Admin access required");
    }
    return { auth, isAdmin: true };
  }

  // Fallback to eaOrgId check (legacy - treat as admin for backwards compat)
  const company = await ctx.db.get(companyId);
  if (company && company.eaOrgId === auth.eaOrgId) {
    return { auth, isAdmin: true };
  }

  throw new ConvexError("Not authorized to access this organization");
}
