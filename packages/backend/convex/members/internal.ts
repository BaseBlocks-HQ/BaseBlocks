import { v } from "convex/values";
/**
 * Internal queries and mutations for members
 * These are called by actions and not exposed to clients
 */
import { internalMutation, internalQuery } from "../_generated/server";

/**
 * Get a company by ID
 */
export const getCompany = internalQuery({
  args: { companyId: v.id("companies") },
  handler: async (ctx, { companyId }) => {
    return await ctx.db.get(companyId);
  },
});

/**
 * Get a member by company and user ID
 */
export const getMemberByUserId = internalQuery({
  args: {
    companyId: v.id("companies"),
    eaUserId: v.string(),
  },
  handler: async (ctx, { companyId, eaUserId }) => {
    return await ctx.db
      .query("members")
      .withIndex("by_company_user", (q) =>
        q.eq("companyId", companyId).eq("eaUserId", eaUserId),
      )
      .first();
  },
});

/**
 * Get a member by ID
 */
export const getMemberById = internalQuery({
  args: { memberId: v.id("members") },
  handler: async (ctx, { memberId }) => {
    return await ctx.db.get(memberId);
  },
});

/**
 * Sync members from Entity Auth data
 */
export const syncMembersFromEA = internalMutation({
  args: {
    companyId: v.id("companies"),
    eaMembers: v.array(
      v.object({
        eaUserId: v.string(),
        email: v.string(),
        name: v.optional(v.string()),
        imageUrl: v.optional(v.string()),
        role: v.union(v.literal("admin"), v.literal("viewer")),
        eaRole: v.string(),
        joinedAt: v.number(),
      }),
    ),
  },
  handler: async (ctx, { companyId, eaMembers }) => {
    const now = Date.now();

    // Get existing members
    const existingMembers = await ctx.db
      .query("members")
      .withIndex("by_company", (q) => q.eq("companyId", companyId))
      .collect();

    const existingByUserId = new Map(
      existingMembers.map((m) => [m.eaUserId, m]),
    );
    const eaUserIds = new Set(eaMembers.map((m) => m.eaUserId));

    let added = 0;
    let updated = 0;
    let removed = 0;

    // Upsert members from EA
    for (const eaMember of eaMembers) {
      const existing = existingByUserId.get(eaMember.eaUserId);

      if (existing) {
        // Update existing member (preserve role unless eaRole changed)
        await ctx.db.patch(existing._id, {
          email: eaMember.email,
          name: eaMember.name,
          imageUrl: eaMember.imageUrl,
          eaRole: eaMember.eaRole,
          // Only update role if EA role changed
          role:
            existing.eaRole !== eaMember.eaRole ? eaMember.role : existing.role,
          syncedAt: now,
        });
        updated++;
      } else {
        // Insert new member
        await ctx.db.insert("members", {
          companyId,
          eaUserId: eaMember.eaUserId,
          email: eaMember.email,
          name: eaMember.name,
          imageUrl: eaMember.imageUrl,
          role: eaMember.role,
          eaRole: eaMember.eaRole,
          joinedAt: eaMember.joinedAt,
          syncedAt: now,
        });
        added++;
      }
    }

    // Remove members no longer in EA
    for (const existing of existingMembers) {
      if (!eaUserIds.has(existing.eaUserId)) {
        await ctx.db.delete(existing._id);
        removed++;
      }
    }

    return { added, updated, removed };
  },
});

/**
 * Delete a member
 */
export const deleteMember = internalMutation({
  args: { memberId: v.id("members") },
  handler: async (ctx, { memberId }) => {
    await ctx.db.delete(memberId);
  },
});

/**
 * Update member role
 */
export const updateMemberRole = internalMutation({
  args: {
    memberId: v.id("members"),
    role: v.union(v.literal("admin"), v.literal("viewer")),
  },
  handler: async (ctx, { memberId, role }) => {
    await ctx.db.patch(memberId, { role });
  },
});

/**
 * Get company by Entity Auth org ID
 */
export const getCompanyByEaOrgId = internalQuery({
  args: { eaOrgId: v.string() },
  handler: async (ctx, { eaOrgId }) => {
    return await ctx.db
      .query("companies")
      .withIndex("by_eaOrgId", (q) => q.eq("eaOrgId", eaOrgId))
      .first();
  },
});

/**
 * Add a single member after accepting an invitation
 */
export const addMemberFromInvitation = internalMutation({
  args: {
    companyId: v.id("companies"),
    eaUserId: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    role: v.union(v.literal("admin"), v.literal("viewer")),
    eaRole: v.string(),
  },
  handler: async (
    ctx,
    { companyId, eaUserId, email, name, imageUrl, role, eaRole },
  ) => {
    const now = Date.now();

    // Check if member already exists
    const existing = await ctx.db
      .query("members")
      .withIndex("by_company_user", (q) =>
        q.eq("companyId", companyId).eq("eaUserId", eaUserId),
      )
      .first();

    if (existing) {
      // Update existing member
      await ctx.db.patch(existing._id, {
        email,
        name,
        imageUrl,
        role,
        eaRole,
        syncedAt: now,
      });
      return { memberId: existing._id, action: "updated" as const };
    }

    // Insert new member
    const memberId = await ctx.db.insert("members", {
      companyId,
      eaUserId,
      email,
      name,
      imageUrl,
      role,
      eaRole,
      joinedAt: now,
      syncedAt: now,
    });

    return { memberId, action: "created" as const };
  },
});
