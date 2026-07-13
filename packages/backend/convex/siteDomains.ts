import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthOrganizationById } from "./authComponent/model";
import { requireOrganizationPermission } from "./permissions";

const domainStatus = v.union(
  v.literal("pending"),
  v.literal("verified"),
  v.literal("misconfigured"),
);

export const resolve = query({
  args: { hostname: v.string() },
  handler: async (ctx, { hostname }) => {
    const mapping = await ctx.db
      .query("siteDomains")
      .withIndex("by_hostname", (q) => q.eq("hostname", hostname))
      .unique();
    if (mapping?.status !== "verified") return null;

    const site = await ctx.db.get(mapping.siteId);
    if (!site?.isPublished) return null;
    const organization = await getAuthOrganizationById(
      ctx,
      site.organizationId,
    );
    if (!organization?.slug) return null;

    return {
      hostname: mapping.hostname,
      organizationSlug: organization.slug,
      siteId: site._id,
      siteSlug: site.slug,
    };
  },
});

export const assertAvailable = query({
  args: { siteId: v.id("sites"), hostname: v.string() },
  handler: async (ctx, { siteId, hostname }) => {
    const site = await ctx.db.get(siteId);
    if (!site) throw new Error("Site not found");
    await requireOrganizationPermission(ctx, site.organizationId, {
      resource: "site",
      action: "manage",
    });
    const existing = await ctx.db
      .query("siteDomains")
      .withIndex("by_hostname", (q) => q.eq("hostname", hostname))
      .unique();
    if (existing && existing.siteId !== siteId) {
      throw new Error("This domain already belongs to another site");
    }
    return true;
  },
});

export const record = mutation({
  args: {
    siteId: v.id("sites"),
    hostname: v.string(),
    status: domainStatus,
  },
  handler: async (ctx, { siteId, hostname, status }) => {
    const site = await ctx.db.get(siteId);
    if (!site) throw new Error("Site not found");
    await requireOrganizationPermission(ctx, site.organizationId, {
      resource: "site",
      action: "manage",
    });

    const existing = await ctx.db
      .query("siteDomains")
      .withIndex("by_hostname", (q) => q.eq("hostname", hostname))
      .unique();
    if (existing && existing.siteId !== siteId) {
      throw new Error("This domain already belongs to another site");
    }

    const now = Date.now();
    const values = {
      siteId,
      hostname,
      status,
      verifiedAt: status === "verified" ? now : undefined,
      updatedAt: now,
    };
    if (existing) {
      await ctx.db.patch(existing._id, values);
      return existing._id;
    }
    return ctx.db.insert("siteDomains", { ...values, createdAt: now });
  },
});

export const remove = mutation({
  args: { siteId: v.id("sites"), hostname: v.string() },
  handler: async (ctx, { siteId, hostname }) => {
    const site = await ctx.db.get(siteId);
    if (!site) throw new Error("Site not found");
    await requireOrganizationPermission(ctx, site.organizationId, {
      resource: "site",
      action: "manage",
    });
    const mapping = await ctx.db
      .query("siteDomains")
      .withIndex("by_hostname", (q) => q.eq("hostname", hostname))
      .unique();
    if (mapping?.siteId === siteId) await ctx.db.delete(mapping._id);
  },
});
