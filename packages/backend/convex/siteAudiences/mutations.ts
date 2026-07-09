import { normalizePageAccessPolicy } from "@baseblocks/domain";
import { v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import { mutation } from "../_generated/server";
import { requireContentEditor, requireSiteManager } from "../auth";
import { getActivePageRevisions } from "../deployments/snapshots";

function removeAudienceFromPolicy(
  policy: Doc<"pages">["accessPolicy"],
  audienceId: Id<"siteAudiences">,
) {
  const normalizedPolicy = normalizePageAccessPolicy(policy);
  if (normalizedPolicy.kind !== "audiences") {
    return normalizedPolicy;
  }

  const audienceIds = normalizedPolicy.audienceIds.filter(
    (existingAudienceId) => existingAudienceId !== audienceId,
  );

  if (audienceIds.length === 0) {
    return {
      kind: "public" as const,
    };
  }

  return {
    kind: "audiences" as const,
    audienceIds: audienceIds as Id<"siteAudiences">[],
  };
}

export const create = mutation({
  args: {
    siteId: v.id("sites"),
    name: v.string(),
  },
  handler: async (ctx, { siteId, name }) => {
    const site = await ctx.db.get(siteId);
    if (!site) {
      throw new Error("Site not found");
    }

    const { auth } = await requireSiteManager(ctx, site.teamId);
    const trimmedName = name.trim();
    if (!trimmedName) {
      throw new Error("Audience name is required");
    }

    const existingAudience = await ctx.db
      .query("siteAudiences")
      .withIndex("by_site_name", (q) =>
        q.eq("siteId", siteId).eq("name", trimmedName),
      )
      .first();

    if (existingAudience) {
      throw new Error(`Audience "${trimmedName}" already exists`);
    }

    const now = Date.now();
    return await ctx.db.insert("siteAudiences", {
      siteId,
      name: trimmedName,
      createdAt: now,
      createdBy: auth.userId,
      updatedAt: now,
    });
  },
});

export const setMembers = mutation({
  args: {
    audienceId: v.id("siteAudiences"),
    userIds: v.array(v.string()),
  },
  handler: async (ctx, { audienceId, userIds }) => {
    const audience = await ctx.db.get(audienceId);
    if (!audience) {
      throw new Error("Audience not found");
    }

    const site = await ctx.db.get(audience.siteId);
    if (!site) {
      throw new Error("Site not found");
    }

    const { auth } = await requireSiteManager(ctx, site.teamId);
    const teamMembers = await ctx.db
      .query("members")
      .withIndex("by_team", (q) => q.eq("teamId", site.teamId))
      .collect();

    const validUserIds = new Set(teamMembers.map((member) => member.userId));
    const normalizedUserIds = Array.from(
      new Set(userIds.map((userId) => userId.trim()).filter(Boolean)),
    );

    for (const userId of normalizedUserIds) {
      if (!validUserIds.has(userId)) {
        throw new Error("All audience members must belong to the team");
      }
    }

    const existingMemberships = await ctx.db
      .query("siteAudienceMembers")
      .withIndex("by_audience_user", (q) => q.eq("audienceId", audienceId))
      .collect();

    const existingByUserId = new Map(
      existingMemberships.map((membership) => [membership.userId, membership]),
    );

    for (const membership of existingMemberships) {
      if (!normalizedUserIds.includes(membership.userId)) {
        await ctx.db.delete(membership._id);
      }
    }

    const now = Date.now();
    for (const userId of normalizedUserIds) {
      if (existingByUserId.has(userId)) {
        continue;
      }

      await ctx.db.insert("siteAudienceMembers", {
        siteId: site._id,
        audienceId,
        userId,
        addedAt: now,
        addedBy: auth.userId,
      });
    }

    await ctx.db.patch(audienceId, {
      updatedAt: now,
    });

    return audienceId;
  },
});

export const deleteAudience = mutation({
  args: {
    audienceId: v.id("siteAudiences"),
  },
  handler: async (ctx, { audienceId }) => {
    const audience = await ctx.db.get(audienceId);
    if (!audience) {
      throw new Error("Audience not found");
    }

    const site = await ctx.db.get(audience.siteId);
    if (!site) {
      throw new Error("Site not found");
    }

    await requireSiteManager(ctx, site.teamId);

    const pages = await ctx.db
      .query("pages")
      .withIndex("by_site", (q) => q.eq("siteId", site._id))
      .collect();

    const deployedPages = await getActivePageRevisions(ctx, site._id);
    const isUsedByPublishedPage = deployedPages.some((page) => {
      const policy = normalizePageAccessPolicy(page.accessPolicy);
      return (
        policy.kind === "audiences" && policy.audienceIds.includes(audienceId)
      );
    });

    if (isUsedByPublishedPage) {
      throw new Error(
        "This audience is used by deployed pages. Remove it from those pages and deploy before deleting it.",
      );
    }

    for (const page of pages) {
      const updatedAccessPolicy = removeAudienceFromPolicy(
        page.accessPolicy,
        audienceId,
      );

      const accessPolicyChanged =
        JSON.stringify(updatedAccessPolicy) !==
        JSON.stringify(normalizePageAccessPolicy(page.accessPolicy));

      if (accessPolicyChanged) {
        await ctx.db.patch(page._id, {
          accessPolicy: updatedAccessPolicy,
          updatedAt: Date.now(),
        });
      }
    }

    const memberships = await ctx.db
      .query("siteAudienceMembers")
      .withIndex("by_audience_user", (q) => q.eq("audienceId", audienceId))
      .collect();

    for (const membership of memberships) {
      await ctx.db.delete(membership._id);
    }

    await ctx.db.delete(audienceId);

    return audienceId;
  },
});

export const validateAudienceIds = mutation({
  args: {
    siteId: v.id("sites"),
    audienceIds: v.array(v.id("siteAudiences")),
  },
  handler: async (ctx, { siteId, audienceIds }) => {
    const site = await ctx.db.get(siteId);
    if (!site) {
      throw new Error("Site not found");
    }

    await requireContentEditor(ctx, site.teamId);

    const uniqueAudienceIds = Array.from(new Set(audienceIds));
    for (const audienceId of uniqueAudienceIds) {
      const audience = await ctx.db.get(audienceId);
      if (!audience || audience.siteId !== siteId) {
        throw new Error("Invalid audience selection");
      }
    }

    return uniqueAudienceIds;
  },
});
