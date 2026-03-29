import { teamRoles } from "@baseblocks/types";
import { v } from "convex/values";
import { components } from "../_generated/api";
import { mutation } from "../_generated/server";
import { getAuthContext, requireAdmin } from "../auth";

export const updateRole = mutation({
  args: {
    memberId: v.id("members"),
    role: v.union(...teamRoles.map((role) => v.literal(role))),
  },
  handler: async (ctx, { memberId, role }) => {
    const memberToUpdate = await ctx.db.get(memberId);
    if (!memberToUpdate) {
      throw new Error("Member not found");
    }

    await requireAdmin(ctx, memberToUpdate.teamId);

    const auth = await getAuthContext(ctx);
    if (memberToUpdate.userId === auth.userId && role !== "admin") {
      const admins = await ctx.db
        .query("members")
        .withIndex("by_team", (q) => q.eq("teamId", memberToUpdate.teamId))
        .filter((q) => q.eq(q.field("role"), "admin"))
        .collect();

      if (admins.length <= 1) {
        throw new Error("Cannot remove the last admin");
      }
    }

    await ctx.db.patch(memberId, { role });
    return { success: true };
  },
});

export const deleteMyAccountData = mutation({
  args: {},
  handler: async (ctx) => {
    const auth = await getAuthContext(ctx);

    const memberRecords = await ctx.db
      .query("members")
      .withIndex("by_user", (q) => q.eq("userId", auth.userId))
      .collect();

    for (const member of memberRecords) {
      if (member.role === "admin") {
        const admins = await ctx.db
          .query("members")
          .withIndex("by_team", (q) => q.eq("teamId", member.teamId))
          .filter((q) => q.eq(q.field("role"), "admin"))
          .collect();

        if (admins.length <= 1) {
          throw new Error(
            "Cannot delete account: you are the last admin of a team. Transfer admin role first.",
          );
        }
      }
    }

    for (const member of memberRecords) {
      await ctx.db.delete(member._id);
    }

    return { success: true, deletedMemberRecords: memberRecords.length };
  },
});

export const ensureCreatorMember = mutation({
  args: {
    teamId: v.id("teams"),
  },
  handler: async (ctx, { teamId }) => {
    const auth = await getAuthContext(ctx);

    const team = await ctx.db.get(teamId);
    if (!team) {
      throw new Error("Team not found");
    }

    if (team.createdBy !== auth.userId) {
      throw new Error("Only the team creator can use this operation");
    }

    const existingMember = await ctx.db
      .query("members")
      .withIndex("by_team_user", (q) =>
        q.eq("teamId", teamId).eq("userId", auth.userId),
      )
      .first();

    if (existingMember) {
      return { memberId: existingMember._id, alreadyExists: true };
    }

    const now = Date.now();
    const memberId = await ctx.db.insert("members", {
      teamId,
      userId: auth.userId,
      email: auth.email || "",
      name: auth.name,
      imageUrl: auth.imageUrl,
      role: "admin",
      joinedAt: now,
    });

    return { memberId, alreadyExists: false };
  },
});

export const syncMemberFromInvitation = mutation({
  args: {
    organizationId: v.string(),
  },
  handler: async (ctx, { organizationId }) => {
    const auth = await getAuthContext(ctx);

    const baMembers = await ctx.runQuery(
      components.betterAuth.adapter.findMany,
      {
        model: "member",
        where: [
          { field: "organizationId", operator: "eq", value: organizationId },
          { field: "userId", operator: "eq", value: auth.userId },
        ],
        limit: 1,
        paginationOpts: { numItems: 1, cursor: null },
      },
    );

    if (
      !baMembers ||
      !("page" in baMembers) ||
      (baMembers as { page: unknown[] }).page.length === 0
    ) {
      throw new Error(
        "No membership found. Accept the invitation before syncing.",
      );
    }

    const baMemberRecord = (baMembers as { page: Record<string, unknown>[] })
      .page[0]!;
    const baRole = (baMemberRecord.role as string) || "member";

    const team = await ctx.db
      .query("teams")
      .withIndex("by_organizationId", (q) =>
        q.eq("organizationId", organizationId),
      )
      .first();

    if (!team) {
      throw new Error("Team not found for this organization");
    }

    const existing = await ctx.db
      .query("members")
      .withIndex("by_team_user", (q) =>
        q.eq("teamId", team._id).eq("userId", auth.userId),
      )
      .first();

    if (existing) {
      return { memberId: existing._id, alreadyExists: true };
    }

    const convexRole = baRole === "admin" ? "admin" : "editor";

    const memberId = await ctx.db.insert("members", {
      teamId: team._id,
      userId: auth.userId,
      email: auth.email || "",
      name: auth.name,
      imageUrl: auth.imageUrl,
      role: convexRole,
      joinedAt: Date.now(),
    });

    return { memberId, alreadyExists: false };
  },
});

export const removeMember = mutation({
  args: {
    teamId: v.id("teams"),
    memberId: v.id("members"),
  },
  handler: async (ctx, { teamId, memberId }) => {
    const { auth } = await requireAdmin(ctx, teamId);

    const memberToRemove = await ctx.db.get(memberId);
    if (!memberToRemove) {
      throw new Error("Member not found");
    }

    if (memberToRemove.teamId !== teamId) {
      throw new Error("Member does not belong to this team");
    }

    if (memberToRemove.userId === auth.userId) {
      throw new Error("Cannot remove yourself from the organization");
    }

    await ctx.db.delete(memberId);
    return { success: true };
  },
});
