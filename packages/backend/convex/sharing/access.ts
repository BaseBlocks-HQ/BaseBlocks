import type { GenericQueryCtx } from "convex/server";
import type { DataModel, Doc } from "../_generated/dataModel";

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
