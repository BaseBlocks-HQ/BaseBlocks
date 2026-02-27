import { HOUR, MINUTE, RateLimiter } from "@convex-dev/rate-limiter";
import { components } from "./_generated/api";

/**
 * Central rate limit definitions.
 *
 * All limits are keyed per-user (authenticated mutations) or per-resource
 * (public mutations). Adjust numbers based on observed usage patterns.
 */
export const rateLimiter = new RateLimiter(components.rateLimiter, {
  // --- Authenticated write operations ---

  // Site creation: 20 sites per hour per user.
  // Normal editorial workflow rarely exceeds a few per day.
  createSite: { kind: "token bucket", rate: 20, period: HOUR },

  // Team creation: 5 per hour per user.
  // Onboarding creates one team; this allows a generous buffer.
  createTeam: { kind: "token bucket", rate: 5, period: HOUR },

  // --- Public mutations (no auth required) ---

  // Password-protected site verification: 10 attempts per minute per site.
  // Works alongside the existing per-access-code lockout (5 attempts / 15 min)
  // to add a network-level defence against distributed brute-force.
  verifyAccessCode: { kind: "fixed window", rate: 10, period: MINUTE },
});
