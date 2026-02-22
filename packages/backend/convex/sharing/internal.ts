import { internalMutation } from "../_generated/server";
import { generateAccessCode } from "./crypto";

// Rotate expired access codes
export const rotateExpiredCodes = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // Use index to only fetch expired codes (avoids full table scan)
    const expiredCodes = await ctx.db
      .query("siteAccessCodes")
      .withIndex("by_expiresAt", (q) => q.lt("expiresAt", now))
      .collect();

    let rotatedCount = 0;

    for (const expiredCode of expiredCodes) {
      // Get the site to check rotation settings
      const site = await ctx.db.get(expiredCode.siteId);
      if (!site) {
        // Site was deleted, remove the code
        await ctx.db.delete(expiredCode._id);
        continue;
      }

      // Only rotate if site is still in password mode
      if (site.visibility === "password") {
        const rotationHours = site.accessCodeRotationHours ?? 24;

        // Update the code with a new value and expiration
        await ctx.db.patch(expiredCode._id, {
          code: generateAccessCode(),
          expiresAt: now + rotationHours * 60 * 60 * 1000,
          createdAt: now,
        });
        rotatedCount++;
      } else {
        // Site is no longer in password mode, delete the code
        await ctx.db.delete(expiredCode._id);
      }
    }

    return { rotatedCount, checkedCount: expiredCodes.length };
  },
});

// Clean up expired sessions
export const cleanupExpiredSessions = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // Use index to only fetch expired sessions (avoids full table scan)
    const expiredSessions = await ctx.db
      .query("siteAccessSessions")
      .withIndex("by_expiresAt", (q) => q.lt("expiresAt", now))
      .collect();

    for (const session of expiredSessions) {
      await ctx.db.delete(session._id);
    }

    return { deleted: expiredSessions.length };
  },
});
