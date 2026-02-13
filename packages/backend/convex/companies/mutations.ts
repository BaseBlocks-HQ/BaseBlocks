import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { getAuthContext, requireAdmin } from "../auth";

// Create a new company (during onboarding)
export const create = mutation({
  args: {
    name: v.string(),
    slug: v.string(),
    organizationId: v.optional(v.string()),
  },
  handler: async (ctx, { name, slug, organizationId }) => {
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

    const now = Date.now();
    const companyId = await ctx.db.insert("companies", {
      name,
      slug: slug.toLowerCase(),
      organizationId,
      createdBy: auth.userId,
      createdAt: now,
      settings: {
        primaryColor: "#0066FF",
      },
    });

    // Create the creator as an admin member of this company
    await ctx.db.insert("members", {
      companyId,
      userId: auth.userId,
      email: auth.email ?? "",
      name: auth.name,
      imageUrl: auth.imageUrl,
      role: "admin",
      joinedAt: now,
    });

    return companyId;
  },
});

// Link a legacy company to a Better Auth organization (migration)
export const linkOrganization = mutation({
  args: {
    companyId: v.id("companies"),
    organizationId: v.string(),
  },
  handler: async (ctx, { companyId, organizationId }) => {
    await requireAdmin(ctx, companyId);

    const company = await ctx.db.get(companyId);
    if (!company) {
      throw new Error("Company not found");
    }
    if (company.organizationId) {
      return { success: true, alreadyLinked: true };
    }

    await ctx.db.patch(companyId, { organizationId });
    return { success: true, alreadyLinked: false };
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
    await requireAdmin(ctx, companyId);

    const company = await ctx.db.get(companyId);
    if (!company) {
      throw new Error("Company not found");
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
    await requireAdmin(ctx, companyId);

    const updates: Record<string, string> = {};
    if (name !== undefined) updates.name = name;
    if (logoUrl !== undefined) updates.logoUrl = logoUrl;

    await ctx.db.patch(companyId, updates);
    return companyId;
  },
});
