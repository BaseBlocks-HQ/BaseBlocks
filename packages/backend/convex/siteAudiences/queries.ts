import { v } from "convex/values";
import { query } from "../_generated/server";
import { checkIsMember } from "../auth";

export const list = query({
  args: {
    siteId: v.id("sites"),
  },
  handler: async (ctx, { siteId }) => {
    const site = await ctx.db.get(siteId);
    if (!site) {
      return [];
    }

    if (!(await checkIsMember(ctx, site.teamId))) {
      return [];
    }

    const audiences = await ctx.db
      .query("siteAudiences")
      .withIndex("by_site_name", (q) => q.eq("siteId", siteId))
      .collect();

    audiences.sort((a, b) => a.name.localeCompare(b.name));

    const audienceMembers = await ctx.db
      .query("siteAudienceMembers")
      .withIndex("by_site_user", (q) => q.eq("siteId", siteId))
      .collect();

    return audiences.map((audience) => ({
      _id: audience._id,
      name: audience.name,
      memberCount: audienceMembers.filter(
        (membership) => membership.audienceId === audience._id,
      ).length,
    }));
  },
});

export const getMemberAssignments = query({
  args: {
    audienceId: v.id("siteAudiences"),
  },
  handler: async (ctx, { audienceId }) => {
    const audience = await ctx.db.get(audienceId);
    if (!audience) {
      return null;
    }

    const site = await ctx.db.get(audience.siteId);
    if (!site) {
      return null;
    }

    if (!(await checkIsMember(ctx, site.teamId))) {
      return null;
    }

    const memberships = await ctx.db
      .query("siteAudienceMembers")
      .withIndex("by_audience_user", (q) => q.eq("audienceId", audienceId))
      .collect();

    return {
      audience: {
        _id: audience._id,
        name: audience.name,
      },
      userIds: memberships.map((membership) => membership.userId),
    };
  },
});
