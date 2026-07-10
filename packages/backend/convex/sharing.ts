import { ConvexError, v } from "convex/values";
import type { GenericQueryCtx } from "convex/server";
import type { DataModel, Doc, Id } from "./_generated/dataModel";
import { query, mutation } from "./_generated/server";
import {
  isOrganizationMember,
  getAuthContextOrNull,
  requireOrganizationPermission,
} from "./permissions";
import {
  canAccessPagePolicy,
  normalizePageAccessPolicy,
  publicPageAccessPolicy,
} from "@baseblocks/domain";
import { listAuthOrganizationMembers } from "./authComponent/model";

/**
 * Cryptographically secure random generation for access codes and session tokens.
 */

const ACCESS_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Avoiding ambiguous: 0, O, I, 1
const TOKEN_CHARS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

function secureRandomChars(chars: string, length: number): string {
  const array = new Uint32Array(length);
  crypto.getRandomValues(array);
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(array[i]! % chars.length);
  }
  return result;
}

/** Generate a random 6-character alphanumeric access code */
export function generateAccessCode(): string {
  return secureRandomChars(ACCESS_CODE_CHARS, 6);
}

/** Generate a 32-character session token */
export function generateSessionToken(): string {
  return secureRandomChars(TOKEN_CHARS, 32);
}

type PublicAccessCtx = Pick<GenericQueryCtx<DataModel>, "db">;

const MAX_SESSION_TOKENS = 20;

function normalizeSessionTokens(sessionTokens?: string[]): string[] {
  if (!sessionTokens || sessionTokens.length === 0) {
    return [];
  }

  const unique = new Set<string>();
  for (const token of sessionTokens) {
    const trimmed = token.trim();
    if (!trimmed) {
      continue;
    }

    unique.add(trimmed);
    if (unique.size >= MAX_SESSION_TOKENS) {
      break;
    }
  }

  return Array.from(unique);
}

export async function canAccessPublishedSite(
  ctx: PublicAccessCtx,
  site: Doc<"sites">,
  sessionTokens?: string[],
): Promise<boolean> {
  if (!site.isPublished) {
    return false;
  }

  const visibility = site.visibility ?? "public";
  if (visibility === "public" || visibility === "link-only") {
    return true;
  }

  if (visibility === "private") {
    return false;
  }

  const tokens = normalizeSessionTokens(sessionTokens);
  if (tokens.length === 0) {
    return false;
  }

  const now = Date.now();
  for (const token of tokens) {
    const session = await ctx.db
      .query("siteAccessSessions")
      .withIndex("by_site_token", (q) =>
        q.eq("siteId", site._id).eq("sessionToken", token),
      )
      .first();

    if (session && session.expiresAt >= now) {
      return true;
    }
  }

  return false;
}

type QueryCtx = GenericQueryCtx<DataModel>;

export const pageAccessPolicyValidator = v.union(
  v.object({
    kind: v.literal("public"),
  }),
  v.object({
    kind: v.literal("audiences"),
    audienceIds: v.array(v.id("siteAudiences")),
  }),
);

type PublishedViewerContext = {
  audienceIds: Set<string>;
  isTeamMember: boolean;
};

export function getDraftPageAccessPolicy(page: {
  accessPolicy?: Doc<"pages">["accessPolicy"];
}) {
  return normalizePageAccessPolicy(page.accessPolicy ?? publicPageAccessPolicy);
}

export function getPublishedPageAccessPolicy(page: {
  accessPolicy?: Doc<"pages">["accessPolicy"];
}) {
  return normalizePageAccessPolicy(page.accessPolicy ?? publicPageAccessPolicy);
}

export async function resolvePublishedViewerContext(
  ctx: QueryCtx,
  site: Doc<"sites">,
  sessionTokens?: string[],
): Promise<PublishedViewerContext | null> {
  const hasSiteAccess = await canAccessPublishedSite(ctx, site, sessionTokens);
  if (!hasSiteAccess) {
    return null;
  }

  const auth = await getAuthContextOrNull(ctx);
  if (!auth) {
    return {
      audienceIds: new Set<string>(),
      isTeamMember: false,
    };
  }

  if (!(await isOrganizationMember(ctx, site.organizationId))) {
    return {
      audienceIds: new Set<string>(),
      isTeamMember: false,
    };
  }

  const audienceMemberships = await ctx.db
    .query("siteAudienceMembers")
    .withIndex("by_site_user", (q) =>
      q.eq("siteId", site._id).eq("userId", auth.userId),
    )
    .collect();

  return {
    audienceIds: new Set(
      audienceMemberships.map((membership) => membership.audienceId),
    ),
    isTeamMember: true,
  };
}

export function canViewerAccessPublishedPage(
  page: Pick<Doc<"pages">, "accessPolicy">,
  viewer: PublishedViewerContext,
): boolean {
  const policy = getPublishedPageAccessPolicy(page);
  if (policy.kind === "public") {
    return true;
  }

  if (!viewer.isTeamMember) {
    return false;
  }

  return canAccessPagePolicy(policy, viewer.audienceIds);
}

export async function getAccessiblePublishedPages(
  ctx: QueryCtx,
  site: Doc<"sites">,
  sessionTokens?: string[],
): Promise<Doc<"pages">[]> {
  if (!site.isPublished) {
    return [];
  }

  const viewer = await resolvePublishedViewerContext(ctx, site, sessionTokens);
  if (!viewer) {
    return [];
  }

  const pages = await ctx.db
    .query("pages")
    .withIndex("by_site", (q) => q.eq("siteId", site._id))
    .collect();
  const pageIds = new Set(pages.map((page) => page._id));
  const childrenByParent = new Map<string, Doc<"pages">[]>();

  for (const page of pages) {
    const parentId =
      page.parentId && pageIds.has(page.parentId) ? page.parentId : undefined;
    const key = parentId ?? "__root__";
    const existingChildren = childrenByParent.get(key);
    if (existingChildren) {
      existingChildren.push(page);
    } else {
      childrenByParent.set(key, [page]);
    }
  }

  for (const children of childrenByParent.values()) {
    children.sort((a, b) => a.order - b.order);
  }

  const accessiblePages: Doc<"pages">[] = [];

  const visit = (parentId?: Id<"pages">) => {
    const key = parentId ?? "__root__";
    const children = childrenByParent.get(key) ?? [];
    for (const child of children) {
      if (!canViewerAccessPublishedPage(child, viewer)) {
        continue;
      }
      accessiblePages.push(child);
      visit(child._id);
    }
  };

  visit();

  return accessiblePages;
}

export async function canViewerAccessPublishedPageById(
  ctx: QueryCtx,
  pageId: Id<"pages">,
  sessionTokens?: string[],
): Promise<boolean> {
  const page = await ctx.db.get(pageId);
  if (!page) {
    return false;
  }

  const site = await ctx.db.get(page.siteId);
  if (!site) {
    return false;
  }

  const accessiblePages = await getAccessiblePublishedPages(
    ctx,
    site,
    sessionTokens,
  );

  return accessiblePages.some(
    (accessiblePage) => accessiblePage._id === pageId,
  );
}

// Get current access code (admin only)
export const getAccessCode = query({
  args: {
    siteId: v.id("sites"),
  },
  handler: async (ctx, { siteId }) => {
    const site = await ctx.db.get(siteId);
    if (!site) throw new Error("Site not found");

    // Require admin access
    await requireOrganizationPermission(ctx, site.organizationId, { resource: "organization", action: "update" });

    const accessCode = await ctx.db
      .query("siteAccessCodes")
      .withIndex("by_site", (q) => q.eq("siteId", siteId))
      .first();

    if (!accessCode) {
      return null;
    }

    return {
      code: accessCode.code,
      expiresAt: accessCode.expiresAt,
      createdAt: accessCode.createdAt,
      isExpired: accessCode.expiresAt < Date.now(),
    };
  },
});

// Get visibility and access settings (admin only)
export const getSettings = query({
  args: {
    siteId: v.id("sites"),
  },
  handler: async (ctx, { siteId }) => {
    const site = await ctx.db.get(siteId);
    if (!site) throw new Error("Site not found");

    // Require admin access
    await requireOrganizationPermission(ctx, site.organizationId, { resource: "organization", action: "update" });

    return {
      visibility: site.visibility ?? "public",
      accessCodeRotationHours: site.accessCodeRotationHours ?? 24,
      accessCodeSessionDays: site.accessCodeSessionDays ?? 7,
    };
  },
});

// Validate a session token (public query - for visitors)
export const validateSession = query({
  args: {
    siteId: v.id("sites"),
    sessionToken: v.string(),
  },
  handler: async (ctx, { siteId, sessionToken }) => {
    const now = Date.now();

    const session = await ctx.db
      .query("siteAccessSessions")
      .withIndex("by_site_token", (q) =>
        q.eq("siteId", siteId).eq("sessionToken", sessionToken),
      )
      .first();

    if (!session) {
      return { valid: false, reason: "Session not found" };
    }

    if (session.expiresAt < now) {
      return { valid: false, reason: "Session expired" };
    }

    return { valid: true };
  },
});

// Check if current user has access to view a site (combines auth and visibility checks)
export const checkSiteAccess = query({
  args: {
    siteId: v.id("sites"),
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, { siteId, sessionToken }) => {
    const site = await ctx.db.get(siteId);
    if (!site) {
      return { hasAccess: false, reason: "Site not found" };
    }

    const visibility = site.visibility ?? "public";

    // Public and link-only sites are accessible to everyone
    if (visibility === "public" || visibility === "link-only") {
      return { hasAccess: true };
    }

    // For private sites, check if user is authenticated and a member
    if (visibility === "private") {
      const auth = await getAuthContextOrNull(ctx);
      if (!auth) {
        return { hasAccess: false, reason: "Authentication required" };
      }

      const isMember = await isOrganizationMember(ctx, site.organizationId);
      if (!isMember) {
        return {
          hasAccess: false,
          reason: "Not a member of this organization",
        };
      }

      return { hasAccess: true };
    }

    // For password-protected sites, check session token
    if (visibility === "password") {
      if (!sessionToken) {
        return { hasAccess: false, reason: "Access code required" };
      }

      const now = Date.now();
      const session = await ctx.db
        .query("siteAccessSessions")
        .withIndex("by_site_token", (q) =>
          q.eq("siteId", siteId).eq("sessionToken", sessionToken),
        )
        .first();

      if (!session) {
        return { hasAccess: false, reason: "Invalid session" };
      }

      if (session.expiresAt < now) {
        return { hasAccess: false, reason: "Session expired" };
      }

      return { hasAccess: true };
    }

    return { hasAccess: false, reason: "Unknown visibility setting" };
  },
});

// Get site visibility for public check (minimal info for public)
export const getSiteVisibility = query({
  args: {
    siteId: v.id("sites"),
  },
  handler: async (ctx, { siteId }) => {
    const site = await ctx.db.get(siteId);
    if (!site) {
      return null;
    }

    return {
      visibility: site.visibility ?? "public",
      isPublished: site.isPublished,
    };
  },
});

// Visibility types
const visibilityValidator = v.union(
  v.literal("private"),
  v.literal("public"),
  v.literal("link-only"),
  v.literal("password"),
);

// Update site visibility
export const updateVisibility = mutation({
  args: {
    siteId: v.id("sites"),
    visibility: visibilityValidator,
  },
  handler: async (ctx, { siteId, visibility }) => {
    const site = await ctx.db.get(siteId);
    if (!site) throw new Error("Site not found");

    // Require admin access
    await requireOrganizationPermission(ctx, site.organizationId, { resource: "site", action: "manage" });

    const now = Date.now();
    await ctx.db.patch(siteId, {
      visibility,
      updatedAt: now,
    });

    // If switching to password mode, generate an access code if none exists
    if (visibility === "password") {
      const existingCode = await ctx.db
        .query("siteAccessCodes")
        .withIndex("by_site", (q) => q.eq("siteId", siteId))
        .first();

      if (!existingCode) {
        const rotationHours = site.accessCodeRotationHours ?? 24;
        await ctx.db.insert("siteAccessCodes", {
          siteId,
          code: generateAccessCode(),
          expiresAt: now + rotationHours * 60 * 60 * 1000,
          createdAt: now,
        });
      }
    }

    return siteId;
  },
});

// Generate a new access code (admin only)
export const generateNewAccessCode = mutation({
  args: {
    siteId: v.id("sites"),
  },
  handler: async (ctx, { siteId }) => {
    const site = await ctx.db.get(siteId);
    if (!site) throw new Error("Site not found");

    // Require admin access
    await requireOrganizationPermission(ctx, site.organizationId, { resource: "site", action: "manage" });

    const now = Date.now();
    const rotationHours = site.accessCodeRotationHours ?? 24;

    // Delete any existing codes for this site
    const existingCodes = await ctx.db
      .query("siteAccessCodes")
      .withIndex("by_site", (q) => q.eq("siteId", siteId))
      .collect();

    for (const code of existingCodes) {
      await ctx.db.delete(code._id);
    }

    // Create new code
    const newCode = generateAccessCode();
    await ctx.db.insert("siteAccessCodes", {
      siteId,
      code: newCode,
      expiresAt: now + rotationHours * 60 * 60 * 1000,
      createdAt: now,
    });

    return newCode;
  },
});

const MAX_VERIFY_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

// Verify an access code and create a session (public mutation)
export const verifyAccessCode = mutation({
  args: {
    siteId: v.id("sites"),
    code: v.string(),
  },
  handler: async (ctx, { siteId, code }) => {
    const site = await ctx.db.get(siteId);
    if (!site) throw new Error("Site not found");

    // Check if site requires password
    if (site.visibility !== "password") {
      throw new ConvexError("Site does not require password access");
    }

    const now = Date.now();

    // Find valid access code
    const accessCode = await ctx.db
      .query("siteAccessCodes")
      .withIndex("by_site", (q) => q.eq("siteId", siteId))
      .first();

    if (!accessCode) {
      throw new ConvexError("Invalid access code");
    }

    if (accessCode.lockedUntil && accessCode.lockedUntil > now) {
      const minutesRemaining = Math.ceil(
        (accessCode.lockedUntil - now) / 60000,
      );
      throw new ConvexError(
        `Too many failed attempts. Try again in ${minutesRemaining} minute${minutesRemaining !== 1 ? "s" : ""}.`,
      );
    }

    if (accessCode.code !== code.toUpperCase()) {
      const failedAttempts = (accessCode.failedAttempts ?? 0) + 1;
      await ctx.db.patch(accessCode._id, {
        failedAttempts,
        lockedUntil:
          failedAttempts >= MAX_VERIFY_ATTEMPTS ? now + LOCKOUT_DURATION_MS : 0,
      });
      throw new ConvexError("Invalid access code");
    }

    if (accessCode.expiresAt < now) {
      throw new ConvexError("Access code has expired");
    }

    await ctx.db.patch(accessCode._id, { failedAttempts: 0, lockedUntil: 0 });

    // Generate session token
    const sessionToken = generateSessionToken();
    const sessionDays = site.accessCodeSessionDays ?? 7;

    await ctx.db.insert("siteAccessSessions", {
      siteId,
      sessionToken,
      verifiedAt: now,
      expiresAt: now + sessionDays * 24 * 60 * 60 * 1000,
    });

    return { sessionToken };
  },
});

// Update access settings (rotation hours, session days)
export const updateAccessSettings = mutation({
  args: {
    siteId: v.id("sites"),
    accessCodeRotationHours: v.optional(v.number()),
    accessCodeSessionDays: v.optional(v.number()),
  },
  handler: async (
    ctx,
    { siteId, accessCodeRotationHours, accessCodeSessionDays },
  ) => {
    const site = await ctx.db.get(siteId);
    if (!site) throw new Error("Site not found");

    // Require admin access
    await requireOrganizationPermission(ctx, site.organizationId, { resource: "site", action: "manage" });

    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    if (accessCodeRotationHours !== undefined) {
      updates.accessCodeRotationHours = accessCodeRotationHours;
    }
    if (accessCodeSessionDays !== undefined) {
      updates.accessCodeSessionDays = accessCodeSessionDays;
    }

    await ctx.db.patch(siteId, updates);
    return siteId;
  },
});

export const listAudiences = query({
  args: {
    siteId: v.id("sites"),
  },
  handler: async (ctx, { siteId }) => {
    const site = await ctx.db.get(siteId);
    if (!site) {
      return [];
    }

    if (!(await isOrganizationMember(ctx, site.organizationId))) {
      return [];
    }

    const audiences = await ctx.db
      .query("siteAudiences")
      .withIndex("by_site_name", (q) => q.eq("siteId", siteId))
      .collect();

    audiences.sort((a, b) => a.name.localeCompare(b.name));

    const audienceMembers = await ctx.db
      .query("siteAudienceMembers")
      .withIndex("by_site_user", (q) => q.eq("siteId", siteId))
      .collect();

    return audiences.map((audience) => ({
      _id: audience._id,
      name: audience.name,
      memberCount: audienceMembers.filter(
        (membership) => membership.audienceId === audience._id,
      ).length,
    }));
  },
});

export const getAudienceMemberAssignments = query({
  args: {
    audienceId: v.id("siteAudiences"),
  },
  handler: async (ctx, { audienceId }) => {
    const audience = await ctx.db.get(audienceId);
    if (!audience) {
      return null;
    }

    const site = await ctx.db.get(audience.siteId);
    if (!site) {
      return null;
    }

    if (!(await isOrganizationMember(ctx, site.organizationId))) {
      return null;
    }

    const memberships = await ctx.db
      .query("siteAudienceMembers")
      .withIndex("by_audience_user", (q) => q.eq("audienceId", audienceId))
      .collect();

    return {
      audience: {
        _id: audience._id,
        name: audience.name,
      },
      userIds: memberships.map((membership) => membership.userId),
    };
  },
});

function removeAudienceFromPolicy(
  policy: Doc<"pages">["accessPolicy"],
  audienceId: Id<"siteAudiences">,
) {
  const normalizedPolicy = normalizePageAccessPolicy(policy);
  if (normalizedPolicy.kind !== "audiences") {
    return normalizedPolicy;
  }

  const audienceIds = normalizedPolicy.audienceIds.filter(
    (existingAudienceId) => existingAudienceId !== audienceId,
  );

  if (audienceIds.length === 0) {
    return {
      kind: "public" as const,
    };
  }

  return {
    kind: "audiences" as const,
    audienceIds: audienceIds as Id<"siteAudiences">[],
  };
}

export const createAudience = mutation({
  args: {
    siteId: v.id("sites"),
    name: v.string(),
  },
  handler: async (ctx, { siteId, name }) => {
    const site = await ctx.db.get(siteId);
    if (!site) {
      throw new Error("Site not found");
    }

    const { auth } = await requireOrganizationPermission(ctx, site.organizationId, { resource: "site", action: "manage" });
    const trimmedName = name.trim();
    if (!trimmedName) {
      throw new Error("Audience name is required");
    }

    const existingAudience = await ctx.db
      .query("siteAudiences")
      .withIndex("by_site_name", (q) =>
        q.eq("siteId", siteId).eq("name", trimmedName),
      )
      .first();

    if (existingAudience) {
      throw new Error(`Audience "${trimmedName}" already exists`);
    }

    const now = Date.now();
    return await ctx.db.insert("siteAudiences", {
      siteId,
      name: trimmedName,
      createdAt: now,
      createdBy: auth.userId,
      updatedAt: now,
    });
  },
});

export const setAudienceMembers = mutation({
  args: {
    audienceId: v.id("siteAudiences"),
    userIds: v.array(v.string()),
  },
  handler: async (ctx, { audienceId, userIds }) => {
    const audience = await ctx.db.get(audienceId);
    if (!audience) {
      throw new Error("Audience not found");
    }

    const site = await ctx.db.get(audience.siteId);
    if (!site) {
      throw new Error("Site not found");
    }

    const { auth } = await requireOrganizationPermission(ctx, site.organizationId, { resource: "site", action: "manage" });
    const teamMembers = await listAuthOrganizationMembers(
      ctx,
      site.organizationId,
    );

    const validUserIds = new Set(teamMembers.map((member) => member.userId));
    const normalizedUserIds = Array.from(
      new Set(userIds.map((userId) => userId.trim()).filter(Boolean)),
    );

    for (const userId of normalizedUserIds) {
      if (!validUserIds.has(userId)) {
        throw new Error("All audience members must belong to the team");
      }
    }

    const existingMemberships = await ctx.db
      .query("siteAudienceMembers")
      .withIndex("by_audience_user", (q) => q.eq("audienceId", audienceId))
      .collect();

    const existingByUserId = new Map(
      existingMemberships.map((membership) => [membership.userId, membership]),
    );

    for (const membership of existingMemberships) {
      if (!normalizedUserIds.includes(membership.userId)) {
        await ctx.db.delete(membership._id);
      }
    }

    const now = Date.now();
    for (const userId of normalizedUserIds) {
      if (existingByUserId.has(userId)) {
        continue;
      }

      await ctx.db.insert("siteAudienceMembers", {
        siteId: site._id,
        audienceId,
        userId,
        addedAt: now,
        addedBy: auth.userId,
      });
    }

    await ctx.db.patch(audienceId, {
      updatedAt: now,
    });

    return audienceId;
  },
});

export const deleteAudience = mutation({
  args: {
    audienceId: v.id("siteAudiences"),
  },
  handler: async (ctx, { audienceId }) => {
    const audience = await ctx.db.get(audienceId);
    if (!audience) {
      throw new Error("Audience not found");
    }

    const site = await ctx.db.get(audience.siteId);
    if (!site) {
      throw new Error("Site not found");
    }

    await requireOrganizationPermission(ctx, site.organizationId, { resource: "site", action: "manage" });

    const pages = await ctx.db
      .query("pages")
      .withIndex("by_site", (q) => q.eq("siteId", site._id))
      .collect();

    for (const page of pages) {
      const updatedAccessPolicy = removeAudienceFromPolicy(
        page.accessPolicy,
        audienceId,
      );

      const accessPolicyChanged =
        JSON.stringify(updatedAccessPolicy) !==
        JSON.stringify(normalizePageAccessPolicy(page.accessPolicy));

      if (accessPolicyChanged) {
        await ctx.db.patch(page._id, {
          accessPolicy: updatedAccessPolicy,
          updatedAt: Date.now(),
        });
      }
    }

    const memberships = await ctx.db
      .query("siteAudienceMembers")
      .withIndex("by_audience_user", (q) => q.eq("audienceId", audienceId))
      .collect();

    for (const membership of memberships) {
      await ctx.db.delete(membership._id);
    }

    await ctx.db.delete(audienceId);

    return audienceId;
  },
});

export const validateAudienceIds = mutation({
  args: {
    siteId: v.id("sites"),
    audienceIds: v.array(v.id("siteAudiences")),
  },
  handler: async (ctx, { siteId, audienceIds }) => {
    const site = await ctx.db.get(siteId);
    if (!site) {
      throw new Error("Site not found");
    }

    await requireOrganizationPermission(ctx, site.organizationId, { resource: "content", action: "edit" });

    const uniqueAudienceIds = Array.from(new Set(audienceIds));
    for (const audienceId of uniqueAudienceIds) {
      const audience = await ctx.db.get(audienceId);
      if (!audience || audience.siteId !== siteId) {
        throw new Error("Invalid audience selection");
      }
    }

    return uniqueAudienceIds;
  },
});
