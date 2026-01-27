import { v } from "convex/values";
import { query } from "../_generated/server";
import { getAuthContext, getOptionalAuthContext } from "../auth";

// List sites for current company
export const list = query({
  args: {},
  handler: async (ctx) => {
    const auth = await getOptionalAuthContext(ctx);
    const eaOrgId = auth?.eaOrgId;
    if (!eaOrgId) return [];

    // Get user's company
    const company = await ctx.db
      .query("companies")
      .withIndex("by_eaOrgId", (q) => q.eq("eaOrgId", eaOrgId))
      .first();

    if (!company) return [];

    return await ctx.db
      .query("sites")
      .withIndex("by_company", (q) => q.eq("companyId", company._id))
      .collect();
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

    // Verify access
    if (company.eaOrgId !== auth.eaOrgId) {
      throw new Error("Unauthorized");
    }

    return { site, company };
  },
});

// Get site with default page info (for public viewing)
export const getWithDefaultPage = query({
  args: {
    companySlug: v.string(),
  },
  handler: async (ctx, { companySlug }) => {
    // Find company
    const company = await ctx.db
      .query("companies")
      .withIndex("by_slug", (q) => q.eq("slug", companySlug))
      .first();

    if (!company) return null;

    // Get the first published site for this company
    const site = await ctx.db
      .query("sites")
      .withIndex("by_company", (q) => q.eq("companyId", company._id))
      .filter((q) => q.eq(q.field("isPublished"), true))
      .first();

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
