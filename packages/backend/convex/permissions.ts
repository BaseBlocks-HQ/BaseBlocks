import type {
  GenericActionCtx,
  GenericMutationCtx,
  GenericQueryCtx,
} from "convex/server";
import { ConvexError } from "convex/values";
import { components } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import type { Doc, Id } from "./_generated/dataModel";
import {
  guestPermissionAllows,
  type PageGuestPermission,
} from "./model/workspaceFoundation";
import {
  type OrganizationPermission,
  roleHasPermission,
} from "./authComponent/permissions";

type AuthCtx =
  | GenericQueryCtx<DataModel>
  | GenericMutationCtx<DataModel>
  | GenericActionCtx<DataModel>;
type DbAuthCtx = GenericQueryCtx<DataModel> | GenericMutationCtx<DataModel>;

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

type PageGuestGrant = {
  _id: string;
  organizationId: string;
  siteId: Id<"sites">;
  pageId: Id<"pages">;
  userId: string;
  permission: PageGuestPermission;
  status: "active" | "revoked";
};

export type PageAccess = {
  auth: ServerAuthContext;
  page: Doc<"pages">;
  site: Doc<"sites">;
  source: "member" | "guest";
  permission: PageGuestPermission;
  grantRootPageId?: Id<"pages">;
};

type GuestGrantDatabase = {
  query: (table: "pageGuestGrants") => {
    withIndex: (
      name: string,
      build: (q: {
        eq: (
          field: string,
          value: string,
        ) => {
          eq: (
            nextField: string,
            nextValue: string,
          ) => {
            eq: (lastField: string, lastValue: string) => unknown;
          };
        };
      }) => unknown,
    ) => {
      collect: () => Promise<PageGuestGrant[]>;
      first: () => Promise<PageGuestGrant | null>;
    };
  };
};

function guestGrantDb(ctx: DbAuthCtx): GuestGrantDatabase {
  return ctx.db as unknown as GuestGrantDatabase;
}

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
      message: "Workspace membership required",
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
      message: "Insufficient workspace permission",
    });
  }
  return result;
}

export async function isOrganizationMember(
  ctx: DbAuthCtx,
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

export async function getPageAccessOrNull(
  ctx: DbAuthCtx,
  pageId: Id<"pages">,
): Promise<PageAccess | null> {
  const auth = await getAuthContextOrNull(ctx);
  if (!auth) return null;
  const page = await ctx.db.get(pageId);
  if (!page || page.deletedAt !== undefined) return null;
  const site = await ctx.db.get(page.siteId);
  if (!site) return null;

  const member = await findOrganizationMember(
    ctx,
    site.organizationId,
    auth.userId,
  );
  if (member) {
    return {
      auth,
      page,
      site,
      source: "member",
      permission: roleHasPermission(member.role, {
        resource: "content",
        action: "edit",
      })
        ? "editor"
        : "viewer",
    };
  }

  const visited = new Set<string>();
  let candidate: Doc<"pages"> | null = page;
  while (candidate && !visited.has(candidate._id)) {
    visited.add(candidate._id);
    const grant = await guestGrantDb(ctx)
      .query("pageGuestGrants")
      .withIndex("by_page_user_status", (q) =>
        q
          .eq("pageId", candidate!._id)
          .eq("userId", auth.userId)
          .eq("status", "active"),
      )
      .first();
    if (
      grant &&
      grant.siteId === site._id &&
      grant.organizationId === site.organizationId
    ) {
      return {
        auth,
        page,
        site,
        source: "guest",
        permission: grant.permission,
        grantRootPageId: candidate._id,
      };
    }
    if (!candidate.parentId) break;
    const parent: Doc<"pages"> | null = await ctx.db.get(candidate.parentId);
    candidate =
      parent && parent.siteId === site._id && parent.deletedAt === undefined
        ? parent
        : null;
  }
  return null;
}

export async function requirePageAccess(
  ctx: DbAuthCtx,
  pageId: Id<"pages">,
  required: PageGuestPermission,
): Promise<PageAccess> {
  const access = await getPageAccessOrNull(ctx, pageId);
  if (!access || !guestPermissionAllows(access.permission, required)) {
    throw new ConvexError({
      code: "FORBIDDEN",
      message: "Page access required",
    });
  }
  return access;
}

export async function checkPageAccess(
  ctx: DbAuthCtx,
  pageId: Id<"pages">,
  required: PageGuestPermission,
): Promise<boolean> {
  const access = await getPageAccessOrNull(ctx, pageId);
  return Boolean(access && guestPermissionAllows(access.permission, required));
}

export async function listActiveGuestGrantsForSite(
  ctx: DbAuthCtx,
  siteId: Id<"sites">,
  userId: string,
): Promise<PageGuestGrant[]> {
  return await guestGrantDb(ctx)
    .query("pageGuestGrants")
    .withIndex("by_user_site_status", (q) =>
      q.eq("userId", userId).eq("siteId", siteId).eq("status", "active"),
    )
    .collect();
}
