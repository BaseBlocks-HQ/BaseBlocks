import { v } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import { query } from "../_generated/server";
import { getAuthContext, getAuthContextOrNull, requireMember } from "../auth";

// List sites for all teams the user is a member of
export const list = query({
  args: {},
  handler: async (ctx) => {
    const auth = await getAuthContextOrNull(ctx);
    if (!auth) return [];

    // Get all memberships for this user
    const memberships = await ctx.db
      .query("members")
      .withIndex("by_user", (q) => q.eq("userId", auth.userId))
      .collect();

    if (memberships.length === 0) return [];

    // Collect all team IDs from memberships
    const teamIds = memberships.map((m) => m.teamId);

    // Fetch all teams
    const teams = await Promise.all(teamIds.map((id) => ctx.db.get(id)));
    const teamMap = new Map(teams.filter(Boolean).map((t) => [t!._id, t!]));

    // Fetch sites for all teams
    const sitesPromises = teamIds.map((teamId) =>
      ctx.db
        .query("sites")
        .withIndex("by_team", (q) => q.eq("teamId", teamId))
        .collect(),
    );
    const sitesArrays = await Promise.all(sitesPromises);

    // Flatten and add team info
    const sites = sitesArrays.flat().map((site) => {
      const team = teamMap.get(site.teamId);
      return {
        ...site,
        team: team
          ? {
              _id: team._id,
              name: team.name,
              slug: team.slug,
            }
          : null,
      };
    });

    return sites;
  },
});

// Get site by ID (authenticated — editor/dashboard only)
export const get = query({
  args: { siteId: v.id("sites") },
  handler: async (ctx, { siteId }) => {
    const site = await ctx.db.get(siteId);
    if (!site) return null;

    await requireMember(ctx, site.teamId);
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

// Get site with team info (for dashboard)
export const getWithTeam = query({
  args: { siteId: v.id("sites") },
  handler: async (ctx, { siteId }) => {
    const auth = await getAuthContext(ctx);

    const site = await ctx.db.get(siteId);
    if (!site) return null;

    const team = await ctx.db.get(site.teamId);
    if (!team) return null;

    // Verify access via membership
    const membership = await ctx.db
      .query("members")
      .withIndex("by_team_user", (q) =>
        q.eq("teamId", team._id).eq("userId", auth.userId),
      )
      .first();

    if (!membership) {
      throw new Error("Unauthorized");
    }

    return { site, team };
  },
});

// Get site with default page info (for public viewing)
// Returns published field projections for public consumption
export const getWithDefaultPage = query({
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

    // Use published defaultPageId (fall back to draft for migration compat)
    const publishedDefaultPageId =
      site.publishedDefaultPageId ?? site.defaultPageId;

    // Get the default page
    let defaultPage = null;
    if (publishedDefaultPageId) {
      defaultPage = await ctx.db.get(publishedDefaultPageId);
    }

    // If no default page set, get the first deployed page by published order
    if (!defaultPage) {
      const pages = await ctx.db
        .query("pages")
        .withIndex("by_site", (q) => q.eq("siteId", site._id))
        .collect();
      const deployedPages = pages.filter((p) => p.isDeployed);
      deployedPages.sort(
        (a, b) => (a.publishedOrder ?? a.order) - (b.publishedOrder ?? b.order),
      );
      defaultPage = deployedPages[0] ?? null;
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
