import { v } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import { query } from "../_generated/server";
import { checkIsMember } from "../auth";
import { getAccessiblePublishedPages } from "../lib/pageAccess";

export const listByTeam = query({
  args: { teamId: v.id("teams") },
  handler: async (ctx, { teamId }) => {
    const isMember = await checkIsMember(ctx, teamId);
    if (!isMember) return [];

    const team = await ctx.db.get(teamId);
    if (!team) return [];

    const sites = await ctx.db
      .query("sites")
      .withIndex("by_team", (q) => q.eq("teamId", teamId))
      .collect();

    return sites.map((site) => ({
      ...site,
      team: {
        _id: team._id,
        name: team.name,
        slug: team.slug,
      },
    }));
  },
});

// Get site by ID (authenticated — editor/dashboard only)
export const get = query({
  args: { siteId: v.id("sites") },
  handler: async (ctx, { siteId }) => {
    const site = await ctx.db.get(siteId);
    if (!site) return null;

    const isMember = await checkIsMember(ctx, site.teamId);
    if (!isMember) return null;

    return site;
  },
});

// Get site by team slug and site slug (for public viewing)
// Returns published field projections for public consumption
export const getBySlug = query({
  args: {
    teamSlug: v.string(),
    siteSlug: v.optional(v.string()),
  },
  handler: async (ctx, { teamSlug, siteSlug }) => {
    // Find team
    const team = await ctx.db
      .query("teams")
      .withIndex("by_slug", (q) => q.eq("slug", teamSlug))
      .first();

    if (!team) return null;

    // If no site slug, get the default/first site
    let site: Doc<"sites"> | null;
    if (!siteSlug) {
      site = await ctx.db
        .query("sites")
        .withIndex("by_team", (q) => q.eq("teamId", team._id))
        .filter((q) => q.eq(q.field("isPublished"), true))
        .first();
    } else {
      // Get specific site
      site = await ctx.db
        .query("sites")
        .withIndex("by_slug", (q) =>
          q.eq("teamId", team._id).eq("slug", siteSlug),
        )
        .first();
    }

    if (!site || !site.isPublished) return null;

    // Return only public-safe fields with published projections
    return {
      _id: site._id,
      _creationTime: site._creationTime,
      teamId: site.teamId,
      slug: site.slug,
      isPublished: site.isPublished,
      visibility: site.visibility,
      name: site.publishedName ?? site.name,
      logoUrl: site.publishedLogoUrl ?? site.logoUrl,
      defaultPageId: site.publishedDefaultPageId ?? site.defaultPageId,
      settings: site.publishedSettings ?? site.settings,
    };
  },
});

// Get site with default page info (for public viewing)
// Returns published field projections for public consumption
export const getWithDefaultPage = query({
  args: {
    teamSlug: v.string(),
    siteSlug: v.optional(v.string()),
    sessionTokens: v.optional(v.array(v.string())),
  },
  handler: async (ctx, { teamSlug, siteSlug, sessionTokens }) => {
    // Find team
    const team = await ctx.db
      .query("teams")
      .withIndex("by_slug", (q) => q.eq("slug", teamSlug))
      .first();

    if (!team) return null;

    // Get the specific site by slug, or fall back to first published site
    let site: Doc<"sites"> | null;
    if (siteSlug) {
      site = await ctx.db
        .query("sites")
        .withIndex("by_slug", (q) =>
          q.eq("teamId", team._id).eq("slug", siteSlug),
        )
        .first();
    } else {
      site = await ctx.db
        .query("sites")
        .withIndex("by_team", (q) => q.eq("teamId", team._id))
        .filter((q) => q.eq(q.field("isPublished"), true))
        .first();
    }

    if (!site || !site.isPublished) return null;

    const accessiblePages = await getAccessiblePublishedPages(
      ctx,
      site,
      sessionTokens,
    );
    const publishedDefaultPageId =
      site.publishedDefaultPageId ?? site.defaultPageId;

    let defaultPage =
      accessiblePages.find((page) => page._id === publishedDefaultPageId) ??
      null;

    if (!defaultPage) {
      const rootPages = accessiblePages
        .filter((page) => !(page.publishedParentId ?? page.parentId))
        .sort(
          (a, b) =>
            (a.publishedOrder ?? a.order) - (b.publishedOrder ?? b.order),
        );
      defaultPage = rootPages[0] ?? null;
    }

    // Project published fields — only expose public-safe data
    const publishedSite = {
      _id: site._id,
      _creationTime: site._creationTime,
      teamId: site.teamId,
      slug: site.slug,
      isPublished: site.isPublished,
      visibility: site.visibility,
      name: site.publishedName ?? site.name,
      logoUrl: site.publishedLogoUrl ?? site.logoUrl,
      defaultPageId: publishedDefaultPageId,
      settings: site.publishedSettings ?? site.settings,
    };

    // Only expose public-safe team fields
    const publicTeam = {
      _id: team._id,
      name: team.name,
      slug: team.slug,
    };

    return {
      site: publishedSite,
      team: publicTeam,
      defaultPage,
    };
  },
});

// List all published, public-visibility sites with team slugs (for sitemap generation)
// No auth required — only exposes public-safe data
export const listPublishedSlugs = query({
  args: {},
  handler: async (ctx) => {
    const teams = await ctx.db.query("teams").collect();

    const results: Array<{
      teamSlug: string;
      siteSlug: string;
      updatedAt: number;
    }> = [];

    for (const team of teams) {
      const sites = await ctx.db
        .query("sites")
        .withIndex("by_team", (q) => q.eq("teamId", team._id))
        .collect();

      for (const site of sites) {
        if (!site.isPublished) continue;
        if (site.visibility && site.visibility !== "public") continue;

        results.push({
          teamSlug: team.slug,
          siteSlug: site.slug,
          updatedAt: site.updatedAt,
        });
      }
    }

    return results;
  },
});
