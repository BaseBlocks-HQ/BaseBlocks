import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, utf8ToBytes } from "@noble/hashes/utils.js";
import { mutationGeneric, queryGeneric } from "convex/server";
import { ConvexError, v } from "convex/values";
import { components, internal } from "./_generated/api";
import { internalMutation } from "./_generated/server";
import {
  getPageAccessOrNull,
  listActiveGuestGrantsForSite,
  requireOrganizationPermission,
  requireUser,
} from "./permissions";
import {
  normalizeGuestEmail,
  resolveGuestPagePermissions,
} from "./model/workspaceFoundation";

const permissionValidator = v.union(v.literal("viewer"), v.literal("editor"));
const INVITATION_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;

export const expireInvitation = internalMutation({
  args: { invitationId: v.id("pageGuestInvitations") },
  returns: v.null(),
  handler: async (ctx, { invitationId }) => {
    const invitation = await ctx.db.get(invitationId);
    if (invitation?.status !== "pending") return null;
    const now = Date.now();
    if (invitation.expiresAt > now) {
      await ctx.scheduler.runAt(
        invitation.expiresAt,
        internal.pageGuests.expireInvitation,
        { invitationId },
      );
      return null;
    }
    await ctx.db.patch(invitationId, { status: "expired", updatedAt: now });
    return null;
  },
});

function hashInvitationToken(token: string): string {
  return bytesToHex(sha256(utf8ToBytes(token)));
}

function newInvitationToken(): string {
  return `${crypto.randomUUID()}${crypto.randomUUID().replaceAll("-", "")}`;
}

function assertGuestEmail(email: string): string {
  const normalized = normalizeGuestEmail(email);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw new ConvexError({
      code: "INVALID_EMAIL",
      message: "Enter a valid email address",
    });
  }
  return normalized;
}

async function requireGuestManager(ctx: never, pageId: string) {
  const page = (await (
    ctx as { db: { get: (id: string) => Promise<unknown> } }
  ).db.get(pageId)) as {
    _id: string;
    siteId: string;
    deletedAt?: number;
  } | null;
  if (!page || page.deletedAt !== undefined) throw new Error("Page not found");
  const site = (await (
    ctx as { db: { get: (id: string) => Promise<unknown> } }
  ).db.get(page.siteId)) as { _id: string; organizationId: string } | null;
  if (!site) throw new Error("Workspace not found");
  const { auth } = await requireOrganizationPermission(
    ctx,
    site.organizationId,
    { resource: "site", action: "manage" },
  );
  return { auth, page, site };
}

export const listForPage = queryGeneric({
  args: { pageId: v.id("pages") },
  handler: async (ctx, { pageId }) => {
    const { site } = await requireGuestManager(ctx as never, pageId);
    const [invitations, grants] = await Promise.all([
      ctx.db
        .query("pageGuestInvitations")
        .withIndex("by_page_email_status", (q) => q.eq("pageId", pageId))
        .collect(),
      ctx.db
        .query("pageGuestGrants")
        .withIndex("by_site_status", (q) => q.eq("siteId", site._id))
        .collect(),
    ]);
    const hydratedGrants = await Promise.all(
      grants
        .filter((grant) => grant.pageId === pageId && grant.status === "active")
        .map(async (grant) => {
          const user = (await ctx.runQuery(
            components.betterAuth.adapter.findOne,
            {
              model: "user",
              where: [{ field: "_id", operator: "eq", value: grant.userId }],
            },
          )) as { email?: string; name?: string } | null;
          return {
            ...grant,
            email: user?.email ?? "",
            name: user?.name,
          };
        }),
    );
    return {
      invitations: invitations.filter(
        (invitation) => invitation.pageId === pageId,
      ),
      grants: hydratedGrants,
    };
  },
});

export const invite = mutationGeneric({
  args: {
    pageId: v.id("pages"),
    email: v.string(),
    permission: permissionValidator,
  },
  handler: async (ctx, { pageId, email, permission }) => {
    const { auth, page, site } = await requireGuestManager(
      ctx as never,
      pageId,
    );
    const normalizedEmail = assertGuestEmail(email);
    const existing = (
      await ctx.db
        .query("pageGuestInvitations")
        .withIndex("by_page_email_status", (q) => q.eq("pageId", pageId))
        .collect()
    ).find(
      (invitation) =>
        invitation.normalizedEmail === normalizedEmail &&
        invitation.status === "pending",
    );
    if (existing) {
      await ctx.db.patch(existing._id, {
        status: "revoked",
        revokedAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
    const token = newInvitationToken();
    const now = Date.now();
    const invitationId = await ctx.db.insert("pageGuestInvitations", {
      organizationId: site.organizationId,
      siteId: page.siteId,
      pageId,
      normalizedEmail,
      tokenHash: hashInvitationToken(token),
      permission,
      status: "pending",
      invitedBy: auth.userId,
      expiresAt: now + INVITATION_LIFETIME_MS,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.scheduler.runAt(
      now + INVITATION_LIFETIME_MS,
      internal.pageGuests.expireInvitation,
      { invitationId },
    );
    return {
      invitationId,
      token,
      replacedPendingInvitation: Boolean(existing),
    };
  },
});

export const getInvitation = queryGeneric({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const auth = await requireUser(ctx as never);
    const invitation = await ctx.db
      .query("pageGuestInvitations")
      .withIndex("by_token", (q) =>
        q.eq("tokenHash", hashInvitationToken(token)),
      )
      .unique();
    if (
      !invitation ||
      invitation.normalizedEmail !== normalizeGuestEmail(auth.email ?? "")
    ) {
      return null;
    }
    const page = await ctx.db.get(invitation.pageId);
    return page
      ? {
          pageId: invitation.pageId,
          pageTitle: page.title,
          permission: invitation.permission,
          status: invitation.status,
          expiresAt: invitation.expiresAt,
        }
      : null;
  },
});

export const accept = mutationGeneric({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const auth = await requireUser(ctx as never);
    const invitation = await ctx.db
      .query("pageGuestInvitations")
      .withIndex("by_token", (q) =>
        q.eq("tokenHash", hashInvitationToken(token)),
      )
      .unique();
    if (!invitation) throw new ConvexError("Invitation not found");
    if (invitation.normalizedEmail !== normalizeGuestEmail(auth.email ?? "")) {
      throw new ConvexError("Sign in with the invited email address");
    }
    if (
      invitation.status === "accepted" &&
      invitation.acceptedBy === auth.userId
    ) {
      return { pageId: invitation.pageId, alreadyAccepted: true };
    }
    if (invitation.status !== "pending" || invitation.expiresAt <= Date.now()) {
      throw new ConvexError("This invitation is no longer active");
    }
    const existing = (
      await ctx.db
        .query("pageGuestGrants")
        .withIndex("by_page_user_status", (q) =>
          q.eq("pageId", invitation.pageId),
        )
        .collect()
    ).find(
      (grant) => grant.userId === auth.userId && grant.status === "active",
    );
    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        permission: invitation.permission,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("pageGuestGrants", {
        organizationId: invitation.organizationId,
        siteId: invitation.siteId,
        pageId: invitation.pageId,
        userId: auth.userId,
        permission: invitation.permission,
        status: "active",
        invitationId: invitation._id,
        grantedBy: invitation.invitedBy,
        createdAt: now,
        updatedAt: now,
      });
    }
    await ctx.db.patch(invitation._id, {
      status: "accepted",
      acceptedBy: auth.userId,
      acceptedAt: now,
      updatedAt: now,
    });
    return { pageId: invitation.pageId, alreadyAccepted: false };
  },
});

export const updateGrant = mutationGeneric({
  args: { grantId: v.id("pageGuestGrants"), permission: permissionValidator },
  handler: async (ctx, { grantId, permission }) => {
    const grant = await ctx.db.get(grantId);
    if (!grant) throw new Error("Guest access not found");
    await requireGuestManager(ctx as never, grant.pageId);
    await ctx.db.patch(grantId, { permission, updatedAt: Date.now() });
  },
});

export const revokeGrant = mutationGeneric({
  args: { grantId: v.id("pageGuestGrants") },
  handler: async (ctx, { grantId }) => {
    const grant = await ctx.db.get(grantId);
    if (!grant) return;
    await requireGuestManager(ctx as never, grant.pageId);
    await ctx.db.patch(grantId, {
      status: "revoked",
      revokedAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const revokeInvitation = mutationGeneric({
  args: { invitationId: v.id("pageGuestInvitations") },
  handler: async (ctx, { invitationId }) => {
    const invitation = await ctx.db.get(invitationId);
    if (!invitation) return;
    await requireGuestManager(ctx as never, invitation.pageId);
    await ctx.db.patch(invitationId, {
      status: "revoked",
      revokedAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const getGuestWorkspace = queryGeneric({
  args: { pageId: v.id("pages") },
  handler: async (ctx, { pageId }) => {
    const access = await getPageAccessOrNull(ctx as never, pageId);
    if (access?.source !== "guest") return null;
    const pages = await ctx.db
      .query("pages")
      .withIndex("by_site", (q) => q.eq("siteId", access.site._id))
      .collect();
    const grants = await listActiveGuestGrantsForSite(
      ctx as never,
      access.site._id,
      access.auth.userId,
    );
    const permissions = resolveGuestPagePermissions({
      pages: pages.map((page) => ({
        id: page._id,
        parentId: page.parentId,
        deleted: page.deletedAt !== undefined,
      })),
      grants: grants
        .filter((grant) => grant.organizationId === access.site.organizationId)
        .map((grant) => ({
          pageId: grant.pageId,
          permission: grant.permission,
          active: grant.status === "active",
        })),
    });
    const visiblePages = pages
      .filter(
        (page) => permissions.has(page._id) && page.deletedAt === undefined,
      )
      .map((page) => ({
        ...page,
        parentId:
          page.parentId && permissions.has(page.parentId)
            ? page.parentId
            : undefined,
        guestPermission: permissions.get(page._id)!,
      }));
    return {
      site: {
        _id: access.site._id,
        name: access.site.name,
        settings: access.site.settings,
      },
      pages: visiblePages,
      selectedPageId: pageId,
      permission: access.permission,
    };
  },
});

export { hashInvitationToken };
