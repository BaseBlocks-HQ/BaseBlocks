"use node";

import { v } from "convex/values";
import { internal } from "../_generated/api";
/**
 * Member sync actions
 *
 * Syncs members from Entity Auth to local cache
 */
import { action } from "../_generated/server";
import { getActionAuthContext } from "../auth";
import {
  acceptInvitation,
  createInvitation,
  declineInvitation,
  getOrgMembers,
  getReceivedInvitations,
  getSentInvitations,
  mapEARole,
  removeMember,
  revokeInvitation,
  searchUsers,
} from "../lib/entityAuthClient";

/**
 * Sync members from Entity Auth for a company
 */
export const syncMembers = action({
  args: {
    companyId: v.id("companies"),
    accessToken: v.string(),
  },
  handler: async (
    ctx,
    { companyId, accessToken },
  ): Promise<{ added: number; updated: number; removed: number }> => {
    const auth = await getActionAuthContext(ctx);
    if (!auth.eaOrgId) {
      throw new Error("No organization selected");
    }

    // Get company and verify access
    const company = await ctx.runQuery(internal.members.internal.getCompany, {
      companyId,
    });

    if (!company) {
      throw new Error("Company not found");
    }

    if (company.eaOrgId !== auth.eaOrgId) {
      throw new Error("Unauthorized");
    }

    // Get members from Entity Auth
    const eaMembers = await getOrgMembers(company.eaOrgId, accessToken);

    // Sync members to local cache
    // Convert null to undefined since Convex v.optional() doesn't accept null
    const result = await ctx.runMutation(
      internal.members.internal.syncMembersFromEA,
      {
        companyId,
        eaMembers: eaMembers.map((m) => ({
          eaUserId: m.id,
          email: m.email ?? "",
          name: m.username ?? undefined,
          imageUrl: m.imageUrl ?? undefined,
          role: mapEARole(m.role),
          eaRole: m.role,
          joinedAt: m.joinedAt,
        })),
      },
    );

    return result;
  },
});

/**
 * Search users in Entity Auth for inviting
 */
export const searchUsersForInvite = action({
  args: {
    query: v.string(),
    accessToken: v.string(),
  },
  handler: async (ctx, { query, accessToken }) => {
    await getActionAuthContext(ctx); // Verify authenticated

    const results = await searchUsers(query, accessToken, 10);

    return results.map((r) => ({
      id: r.id,
      email: r.email,
      username: r.username,
      imageUrl: r.imageUrl,
    }));
  },
});

/**
 * Invite a user to the organization
 */
export const inviteUser = action({
  args: {
    companyId: v.id("companies"),
    inviteeUserId: v.string(),
    role: v.union(v.literal("admin"), v.literal("viewer")),
    accessToken: v.string(),
  },
  handler: async (ctx, { companyId, inviteeUserId, role, accessToken }) => {
    const auth = await getActionAuthContext(ctx);
    if (!auth.eaOrgId) {
      throw new Error("No organization selected");
    }

    // Get company and verify access
    const company = await ctx.runQuery(internal.members.internal.getCompany, {
      companyId,
    });

    if (!company) {
      throw new Error("Company not found");
    }

    if (company.eaOrgId !== auth.eaOrgId) {
      throw new Error("Unauthorized");
    }

    // Check if user is admin
    const member = await ctx.runQuery(
      internal.members.internal.getMemberByUserId,
      {
        companyId,
        eaUserId: auth.userId,
      },
    );

    if (!member || member.role !== "admin") {
      throw new Error("Admin access required");
    }

    // Map role to EA role (admin -> admin, viewer -> member)
    const eaRole = role === "admin" ? "admin" : "member";

    // Create invitation in Entity Auth
    const result = await createInvitation(
      company.eaOrgId,
      inviteeUserId,
      eaRole,
      accessToken,
    );

    return {
      invitationId: result.invitationId,
      expiresAt: result.expiresAt,
    };
  },
});

/**
 * Get pending invitations for a company
 */
export const getPendingInvitations = action({
  args: {
    companyId: v.id("companies"),
    accessToken: v.string(),
  },
  handler: async (
    ctx,
    { companyId, accessToken },
  ): Promise<
    Array<{
      id: string;
      inviteeUserId: string;
      inviteeEmail: string | undefined;
      inviteeUsername: string | undefined;
      role: "admin" | "viewer";
      expiresAt: string;
      createdAt: string;
    }>
  > => {
    const auth = await getActionAuthContext(ctx);
    if (!auth.eaOrgId) {
      throw new Error("No organization selected");
    }

    // Get company and verify access
    const company = await ctx.runQuery(internal.members.internal.getCompany, {
      companyId,
    });

    if (!company) {
      throw new Error("Company not found");
    }

    if (company.eaOrgId !== auth.eaOrgId) {
      throw new Error("Unauthorized");
    }

    // Get sent invitations from Entity Auth
    const invitations = await getSentInvitations(accessToken);

    // Filter to only invitations for this org
    return invitations
      .filter(
        (inv) => inv.orgId === company.eaOrgId && inv.status === "pending",
      )
      .map((inv) => ({
        id: inv.id,
        inviteeUserId: inv.inviteeUserId,
        inviteeEmail: inv.inviteeEmail,
        inviteeUsername: inv.inviteeUsername,
        role: mapEARole(inv.role),
        expiresAt: inv.expiresAt,
        createdAt: inv.createdAt,
      }));
  },
});

/**
 * Revoke an invitation
 */
export const cancelInvitation = action({
  args: {
    companyId: v.id("companies"),
    invitationId: v.string(),
    accessToken: v.string(),
  },
  handler: async (ctx, { companyId, invitationId, accessToken }) => {
    const auth = await getActionAuthContext(ctx);
    if (!auth.eaOrgId) {
      throw new Error("No organization selected");
    }

    // Verify admin access
    const member = await ctx.runQuery(
      internal.members.internal.getMemberByUserId,
      {
        companyId,
        eaUserId: auth.userId,
      },
    );

    if (!member || member.role !== "admin") {
      throw new Error("Admin access required");
    }

    // Revoke in Entity Auth
    await revokeInvitation(invitationId, accessToken);

    return { success: true };
  },
});

/**
 * Remove a member from the organization (both EA and local cache)
 */
export const removeMemberFromOrg = action({
  args: {
    companyId: v.id("companies"),
    memberId: v.id("members"),
    accessToken: v.string(),
  },
  handler: async (ctx, { companyId, memberId, accessToken }) => {
    const auth = await getActionAuthContext(ctx);
    if (!auth.eaOrgId) {
      throw new Error("No organization selected");
    }

    // Get company
    const company = await ctx.runQuery(internal.members.internal.getCompany, {
      companyId,
    });

    if (!company) {
      throw new Error("Company not found");
    }

    if (company.eaOrgId !== auth.eaOrgId) {
      throw new Error("Unauthorized");
    }

    // Verify admin access
    const currentMember = await ctx.runQuery(
      internal.members.internal.getMemberByUserId,
      {
        companyId,
        eaUserId: auth.userId,
      },
    );

    if (!currentMember || currentMember.role !== "admin") {
      throw new Error("Admin access required");
    }

    // Get the member to remove
    const memberToRemove = await ctx.runQuery(
      internal.members.internal.getMemberById,
      {
        memberId,
      },
    );

    if (!memberToRemove) {
      throw new Error("Member not found");
    }

    if (memberToRemove.companyId !== companyId) {
      throw new Error("Member does not belong to this company");
    }

    // Cannot remove yourself
    if (memberToRemove.eaUserId === auth.userId) {
      throw new Error("Cannot remove yourself from the organization");
    }

    // Cannot remove the owner
    if (memberToRemove.eaRole === "owner") {
      throw new Error("Cannot remove the organization owner");
    }

    // Remove from Entity Auth
    await removeMember(company.eaOrgId, memberToRemove.eaUserId, accessToken);

    // Remove from local cache
    await ctx.runMutation(internal.members.internal.deleteMember, {
      memberId,
    });

    return { success: true };
  },
});

/**
 * Get received invitations (invitations sent TO the current user)
 */
export const getMyReceivedInvitations = action({
  args: {
    accessToken: v.string(),
  },
  handler: async (ctx, { accessToken }) => {
    await getActionAuthContext(ctx); // Verify authenticated

    const invitations = await getReceivedInvitations(accessToken);

    return invitations
      .filter((inv) => inv.status === "pending")
      .map((inv) => ({
        id: inv.id,
        orgId: inv.orgId,
        role: mapEARole(inv.role),
        eaRole: inv.role, // Original EA role for sync
        expiresAt: inv.expiresAt,
        createdAt: inv.createdAt,
        inviterEmail: inv.person.email,
        inviterUsername: inv.person.username,
        inviterImageUrl: inv.person.imageUrl,
      }));
  },
});

/**
 * Accept a received invitation
 */
export const acceptReceivedInvitation = action({
  args: {
    invitationId: v.string(),
    accessToken: v.string(),
    orgId: v.string(), // Entity Auth org ID from the invitation
    role: v.union(v.literal("admin"), v.literal("viewer")), // Role from the invitation
    eaRole: v.string(), // Original EA role (admin/member)
  },
  handler: async (ctx, { invitationId, accessToken, orgId, role, eaRole }) => {
    const auth = await getActionAuthContext(ctx);

    // Accept the invitation in Entity Auth
    await acceptInvitation(invitationId, accessToken);

    // Find the company in our database by eaOrgId
    const company = await ctx.runQuery(
      internal.members.internal.getCompanyByEaOrgId,
      {
        eaOrgId: orgId,
      },
    );

    if (!company) {
      // Company not found - org exists in Entity Auth but not in our DB
      return { success: true, memberSynced: false };
    }

    // Add the current user as a member of the company
    await ctx.runMutation(internal.members.internal.addMemberFromInvitation, {
      companyId: company._id,
      eaUserId: auth.userId,
      email: auth.email ?? "",
      name: auth.username,
      imageUrl: auth.imageUrl,
      role,
      eaRole,
    });

    return { success: true, memberSynced: true };
  },
});

/**
 * Decline a received invitation
 */
export const declineReceivedInvitation = action({
  args: {
    invitationId: v.string(),
    accessToken: v.string(),
  },
  handler: async (ctx, { invitationId, accessToken }) => {
    await getActionAuthContext(ctx); // Verify authenticated

    await declineInvitation(invitationId, accessToken);

    return { success: true };
  },
});
