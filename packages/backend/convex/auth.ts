import type {
  GenericActionCtx,
  GenericMutationCtx,
  GenericQueryCtx,
} from "convex/server";
import { ConvexError } from "convex/values";
import type { DataModel } from "./_generated/dataModel";
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
