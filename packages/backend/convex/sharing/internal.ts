import { internalMutation } from "../_generated/server";

// Generate a random 6-character alphanumeric code
function generateAccessCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Avoiding ambiguous chars: 0, O, I, 1
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Rotate expired access codes
export const rotateExpiredCodes = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // Get all expired access codes
    const allCodes = await ctx.db.query("siteAccessCodes").collect();
    const expiredCodes = allCodes.filter((c) => c.expiresAt < now);

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

    // Get all sessions and filter expired ones
    const allSessions = await ctx.db.query("siteAccessSessions").collect();
    const expiredSessions = allSessions.filter((s) => s.expiresAt < now);

    for (const session of expiredSessions) {
      await ctx.db.delete(session._id);
    }

    return { deleted: expiredSessions.length };
  },
});
