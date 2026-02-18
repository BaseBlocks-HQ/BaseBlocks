import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { getAuthContext, requireAdmin } from "../auth";

// Create a new team (during onboarding)
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
      .query("teams")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();

    if (existing) {
      throw new Error(
        `The workspace URL "${slug}" is already taken. Please choose a different name.`
      );
    }

    const now = Date.now();
    const teamId = await ctx.db.insert("teams", {
      name,
      slug: slug.toLowerCase(),
      organizationId,
      createdBy: auth.userId,
      createdAt: now,
      settings: {
        primaryColor: "#0066FF",
      },
    });

    // Create the creator as an admin member of this team
    await ctx.db.insert("members", {
      teamId,
      userId: auth.userId,
      email: auth.email ?? "",
      name: auth.name,
      imageUrl: auth.imageUrl,
      role: "admin",
      joinedAt: now,
    });

    return teamId;
  },
});

// Update team settings
export const updateSettings = mutation({
  args: {
    teamId: v.id("teams"),
    settings: v.object({
      primaryColor: v.optional(v.string()),
      customDomain: v.optional(v.string()),
    }),
  },
  handler: async (ctx, { teamId, settings }) => {
    await requireAdmin(ctx, teamId);

    const team = await ctx.db.get(teamId);
    if (!team) {
      throw new Error("Team not found");
    }

    await ctx.db.patch(teamId, {
      settings: { ...team.settings, ...settings },
    });

    return teamId;
  },
});

// Update team profile
export const updateProfile = mutation({
  args: {
    teamId: v.id("teams"),
    name: v.optional(v.string()),
    logoUrl: v.optional(v.string()),
  },
  handler: async (ctx, { teamId, name, logoUrl }) => {
    await requireAdmin(ctx, teamId);

    const updates: Record<string, string> = {};
    if (name !== undefined) updates.name = name;
    if (logoUrl !== undefined) updates.logoUrl = logoUrl;

    await ctx.db.patch(teamId, updates);
    return teamId;
  },
});
