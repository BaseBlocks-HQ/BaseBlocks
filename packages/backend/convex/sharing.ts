import { ConvexError, v } from "convex/values";
import type { GenericQueryCtx } from "convex/server";
import type { DataModel, Doc, Id } from "./_generated/dataModel";
import { query, mutation } from "./_generated/server";
import { requireOrganizationPermission } from "./permissions";

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

export async function getAccessiblePublishedPages(
  ctx: QueryCtx,
  site: Doc<"sites">,
  sessionTokens?: string[],
): Promise<Doc<"pages">[]> {
  if (!(await canAccessPublishedSite(ctx, site, sessionTokens))) {
    return [];
  }

  return ctx.db
    .query("pages")
    .withIndex("by_site", (q) => q.eq("siteId", site._id))
    .collect();
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

  return canAccessPublishedSite(ctx, site, sessionTokens);
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
    await requireOrganizationPermission(ctx, site.organizationId, {
      resource: "organization",
      action: "update",
    });

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
    await requireOrganizationPermission(ctx, site.organizationId, {
      resource: "organization",
      action: "update",
    });

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
    await requireOrganizationPermission(ctx, site.organizationId, {
      resource: "site",
      action: "manage",
    });

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
    await requireOrganizationPermission(ctx, site.organizationId, {
      resource: "site",
      action: "manage",
    });

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
    await requireOrganizationPermission(ctx, site.organizationId, {
      resource: "site",
      action: "manage",
    });

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
