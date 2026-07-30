import { ConvexError } from "convex/values";
import { env } from "./_generated/server";

export function areIntegrationsEnabled() {
  return env.INTEGRATIONS_ENABLED === "true";
}

export function requireIntegrationsEnabled() {
  if (areIntegrationsEnabled()) return;

  throw new ConvexError({
    code: "FEATURE_UNAVAILABLE",
    message: "Integrations are coming soon",
  });
}
