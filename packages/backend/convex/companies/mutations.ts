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
      throw new Error(
        `The workspace URL "${slug}" is already taken. Please choose a different name.`
      );
    }

    // Check if company already exists for this org
    const existingOrg = await ctx.db
      .query("companies")
      .withIndex("by_eaOrgId", (q) => q.eq("eaOrgId", eaOrgId))
      .first();

    if (existingOrg) {
      throw new Error(
        "A workspace already exists for this organization. Please contact support if you need assistance."
      );
    }

    const now = Date.now();
    const companyId = await ctx.db.insert("companies", {
      name,
      slug: slug.toLowerCase(),
      eaOrgId,
      createdBy: auth.userId,
      createdAt: now,
      settings: {
        primaryColor: "#0066FF",
      },
    });

    // Create the creator as an admin member of this company
    await ctx.db.insert("members", {
      companyId,
      eaUserId: auth.userId,
      email: auth.email ?? "",
      name: auth.username,
      imageUrl: auth.imageUrl,
      role: "admin",
      eaRole: "owner",
      joinedAt: now,
      syncedAt: now,
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
