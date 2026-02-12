import { v } from "convex/values";
import { query } from "../_generated/server";
import { getAuthContext, getOptionalAuthContext } from "../auth";

// List sites for all companies the user is a member of
export const list = query({
  args: {},
  handler: async (ctx) => {
    const auth = await getOptionalAuthContext(ctx);
    if (!auth) return [];

    // Get all memberships for this user
    const memberships = await ctx.db
      .query("members")
      .withIndex("by_ea_user", (q) => q.eq("eaUserId", auth.userId))
      .collect();

    // Also check for legacy access via eaOrgId (user's own company)
    let ownCompany = null;
    const eaOrgId = auth.eaOrgId;
    if (eaOrgId) {
      ownCompany = await ctx.db
        .query("companies")
        .withIndex("by_eaOrgId", (q) => q.eq("eaOrgId", eaOrgId))
        .first();
    }

    // Collect all company IDs (from memberships + own company)
    const companyIds = new Set(memberships.map((m) => m.companyId));
    if (ownCompany) {
      companyIds.add(ownCompany._id);
    }

    if (companyIds.size === 0) return [];

    // Fetch all companies
    const companies = await Promise.all(
      Array.from(companyIds).map((id) => ctx.db.get(id)),
    );
    const companyMap = new Map(
      companies.filter(Boolean).map((c) => [c!._id, c!]),
    );

    // Fetch sites for all companies
    const sitesPromises = Array.from(companyIds).map((companyId) =>
      ctx.db
        .query("sites")
        .withIndex("by_company", (q) => q.eq("companyId", companyId))
        .collect(),
    );
    const sitesArrays = await Promise.all(sitesPromises);

    // Flatten and add company info
    const sites = sitesArrays.flat().map((site) => {
      const company = companyMap.get(site.companyId);
      return {
        ...site,
        company: company
          ? {
              _id: company._id,
              name: company.name,
              slug: company.slug,
            }
          : null,
      };
    });

    return sites;
  },
});

// Get site by ID
export const get = query({
  args: { siteId: v.id("sites") },
  handler: async (ctx, { siteId }) => {
    return await ctx.db.get(siteId);
  },
});

// Get site by company slug and site slug (for public viewing)
export const getBySlug = query({
  args: {
    companySlug: v.string(),
    siteSlug: v.optional(v.string()),
  },
  handler: async (ctx, { companySlug, siteSlug }) => {
    // Find company
    const company = await ctx.db
      .query("companies")
      .withIndex("by_slug", (q) => q.eq("slug", companySlug))
      .first();

    if (!company) return null;

    // If no site slug, get the default/first site
    if (!siteSlug) {
      return await ctx.db
        .query("sites")
        .withIndex("by_company", (q) => q.eq("companyId", company._id))
        .filter((q) => q.eq(q.field("isPublished"), true))
        .first();
    }

    // Get specific site
    return await ctx.db
      .query("sites")
      .withIndex("by_slug", (q) =>
        q.eq("companyId", company._id).eq("slug", siteSlug),
      )
      .first();
  },
});

// Get site with company info (for dashboard)
export const getWithCompany = query({
  args: { siteId: v.id("sites") },
  handler: async (ctx, { siteId }) => {
    const auth = await getAuthContext(ctx);

    const site = await ctx.db.get(siteId);
    if (!site) return null;

    const company = await ctx.db.get(site.companyId);
    if (!company) return null;

    // Verify access - check eaOrgId OR membership
    const hasOrgAccess = company.eaOrgId === auth.eaOrgId;
    const membership = await ctx.db
      .query("members")
      .withIndex("by_company_user", (q) =>
        q.eq("companyId", company._id).eq("eaUserId", auth.userId),
      )
      .first();

    if (!hasOrgAccess && !membership) {
      throw new Error("Unauthorized");
    }

    return { site, company };
  },
});

// Get site with default page info (for public viewing)
export const getWithDefaultPage = query({
  args: {
    companySlug: v.string(),
    siteSlug: v.optional(v.string()),
  },
  handler: async (ctx, { companySlug, siteSlug }) => {
    // Find company
    const company = await ctx.db
      .query("companies")
      .withIndex("by_slug", (q) => q.eq("slug", companySlug))
      .first();

    if (!company) return null;

    // Get the specific site by slug, or fall back to first published site
    let site;
    if (siteSlug) {
      site = await ctx.db
        .query("sites")
        .withIndex("by_slug", (q) =>
          q.eq("companyId", company._id).eq("slug", siteSlug),
        )
        .first();
    } else {
      site = await ctx.db
        .query("sites")
        .withIndex("by_company", (q) => q.eq("companyId", company._id))
        .filter((q) => q.eq(q.field("isPublished"), true))
        .first();
    }

    if (!site) return null;

    // Get the default page
    let defaultPage = null;
    if (site.defaultPageId) {
      defaultPage = await ctx.db.get(site.defaultPageId);
    }

    // If no default page set, get the first page by order
    if (!defaultPage) {
      defaultPage = await ctx.db
        .query("pages")
        .withIndex("by_site", (q) => q.eq("siteId", site._id))
        .first();
    }

    return {
      site,
      company,
      defaultPage,
    };
  },
});
