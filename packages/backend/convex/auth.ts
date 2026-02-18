import type {
  GenericActionCtx,
  GenericMutationCtx,
  GenericQueryCtx,
} from "convex/server";
import { ConvexError } from "convex/values";
import type { DataModel, Id } from "./_generated/dataModel";
import { query } from "./_generated/server";

type AuthCtx = GenericQueryCtx<DataModel> | GenericMutationCtx<DataModel>;
type ActionAuthCtx = GenericActionCtx<DataModel>;

export type ServerAuthContext = {
  userId: string;
  email?: string;
  name?: string;
  imageUrl?: string;
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

export const getAuthContext = getServerAuthContext;

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
    throw new ConvexError("Not authenticated");
  }
  return auth;
}

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
      };
    }

    // Check if user has a team (member of any org)
    const member = await ctx.db
      .query("members")
      .withIndex("by_user", (q) => q.eq("userId", auth.userId))
      .first();

    return {
      isAuthenticated: true,
      hasOrganization: !!member,
      user: {
        id: auth.userId,
        email: auth.email,
        name: auth.name,
        imageUrl: auth.imageUrl,
      },
    };
  },
});

// Role-based authorization helpers

type MemberInfo = {
  _id: Id<"members">;
  role: "admin" | "viewer";
  userId: string;
};

type AuthWithMember = {
  auth: ServerAuthContext;
  member: MemberInfo;
};

async function getMemberByUserId(
  ctx: AuthCtx,
  teamId: Id<"teams">,
  userId: string,
): Promise<MemberInfo | null> {
  const member = await ctx.db
    .query("members")
    .withIndex("by_team_user", (q) =>
      q.eq("teamId", teamId).eq("userId", userId),
    )
    .first();

  if (!member) return null;

  return {
    _id: member._id,
    role: member.role,
    userId: member.userId!,
  };
}

export async function requireAdmin(
  ctx: AuthCtx,
  teamId: Id<"teams">,
): Promise<AuthWithMember> {
  const auth = await requireAuthContext(ctx);
  const member = await getMemberByUserId(ctx, teamId, auth.userId);

  if (!member) {
    throw new ConvexError("Not a member of this organization");
  }

  if (member.role !== "admin") {
    throw new ConvexError("Admin access required");
  }

  return { auth, member };
}

export async function requireMember(
  ctx: AuthCtx,
  teamId: Id<"teams">,
): Promise<AuthWithMember> {
  const auth = await requireAuthContext(ctx);
  const member = await getMemberByUserId(ctx, teamId, auth.userId);

  if (!member) {
    throw new ConvexError("Not a member of this organization");
  }

  return { auth, member };
}

export async function checkIsAdmin(
  ctx: AuthCtx,
  teamId: Id<"teams">,
): Promise<boolean> {
  const auth = await getAuthContextOrNull(ctx);
  if (!auth) return false;

  const member = await getMemberByUserId(ctx, teamId, auth.userId);
  return member?.role === "admin";
}

export async function checkIsMember(
  ctx: AuthCtx,
  teamId: Id<"teams">,
): Promise<boolean> {
  const auth = await getAuthContextOrNull(ctx);
  if (!auth) return false;

  const member = await getMemberByUserId(ctx, teamId, auth.userId);
  return !!member;
}
