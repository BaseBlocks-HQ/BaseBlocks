import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { getAuthContext } from "../auth";

// Create a new company (during onboarding)
export const create = mutation({
  args: {
    name: v.string(),
    slug: v.string(),
    eaOrgId: v.string(),
  },
  handler: async (ctx, { name, slug, eaOrgId }) => {
    const auth = await getAuthContext(ctx);

    // Check slug availability
    const existing = await ctx.db
      .query("companies")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();

    if (existing) {
      throw new Error("Slug is already taken");
    }

    // Check if company already exists for this org
    const existingOrg = await ctx.db
      .query("companies")
      .withIndex("by_eaOrgId", (q) => q.eq("eaOrgId", eaOrgId))
      .first();

    if (existingOrg) {
      throw new Error("Company already exists for this organization");
    }

    const companyId = await ctx.db.insert("companies", {
      name,
      slug: slug.toLowerCase(),
      eaOrgId,
      createdBy: auth.userId,
      createdAt: Date.now(),
      settings: {
        primaryColor: "#0066FF",
      },
    });

    return companyId;
  },
});

// Update company settings
export const updateSettings = mutation({
  args: {
    companyId: v.id("companies"),
    settings: v.object({
      primaryColor: v.optional(v.string()),
      customDomain: v.optional(v.string()),
    }),
  },
  handler: async (ctx, { companyId, settings }) => {
    const auth = await getAuthContext(ctx);
    const company = await ctx.db.get(companyId);

    if (!company) {
      throw new Error("Company not found");
    }

    // Verify user has access (same org)
    if (company.eaOrgId !== auth.eaOrgId) {
      throw new Error("Unauthorized");
    }

    await ctx.db.patch(companyId, {
      settings: { ...company.settings, ...settings },
    });

    return companyId;
  },
});

// Update company profile
export const updateProfile = mutation({
  args: {
    companyId: v.id("companies"),
    name: v.optional(v.string()),
    logoUrl: v.optional(v.string()),
  },
  handler: async (ctx, { companyId, name, logoUrl }) => {
    const auth = await getAuthContext(ctx);
    const company = await ctx.db.get(companyId);

    if (!company) {
      throw new Error("Company not found");
    }

    if (company.eaOrgId !== auth.eaOrgId) {
      throw new Error("Unauthorized");
    }

    const updates: Record<string, string> = {};
    if (name !== undefined) updates.name = name;
    if (logoUrl !== undefined) updates.logoUrl = logoUrl;

    await ctx.db.patch(companyId, updates);
    return companyId;
  },
});
