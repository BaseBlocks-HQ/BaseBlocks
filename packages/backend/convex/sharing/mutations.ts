import { ConvexError, v } from "convex/values";
import { mutation } from "../_generated/server";
import { requireAdmin } from "../auth";

// Visibility types
const visibilityValidator = v.union(
  v.literal("private"),
  v.literal("public"),
  v.literal("link-only"),
  v.literal("password"),
);

import { generateAccessCode, generateSessionToken } from "./crypto";

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
    await requireAdmin(ctx, site.teamId);

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
    await requireAdmin(ctx, site.teamId);

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
    await requireAdmin(ctx, site.teamId);

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
