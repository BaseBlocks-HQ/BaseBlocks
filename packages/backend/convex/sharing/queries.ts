import { v } from "convex/values";
import { query } from "../_generated/server";
import { requireAdmin, getAuthContextOrNull, checkIsMember } from "../auth";

// Get current access code (admin only)
export const getAccessCode = query({
  args: {
    siteId: v.id("sites"),
  },
  handler: async (ctx, { siteId }) => {
    const site = await ctx.db.get(siteId);
    if (!site) throw new Error("Site not found");

    // Require admin access
    await requireAdmin(ctx, site.companyId);

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
    await requireAdmin(ctx, site.companyId);

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
        q.eq("siteId", siteId).eq("sessionToken", sessionToken)
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

      const isMember = await checkIsMember(ctx, site.companyId);
      if (!isMember) {
        return { hasAccess: false, reason: "Not a member of this organization" };
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
          q.eq("siteId", siteId).eq("sessionToken", sessionToken)
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
