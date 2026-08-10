import {
  type GenericDataModel,
  type GenericMutationCtx,
  internalMutationGeneric,
  mutationGeneric,
  queryGeneric,
} from "convex/server";
import { ConvexError, v } from "convex/values";
import type { GenericId } from "convex/values";
import {
  requireOrganizationMember,
  requireOrganizationPermission,
} from "./permissions";
import {
  WORKSPACE_PROFILE_SCHEMA_VERSION,
  type WorkspaceIntent,
  type WorkspaceProfileSource,
} from "./model/workspaceFoundation";

const intentValidator = v.union(v.literal("personal"), v.literal("work"));
const sourceValidator = v.union(
  v.literal("onboarding"),
  v.literal("migration"),
  v.literal("lazyPersonal"),
);

type WorkspaceProfile = {
  _id: string;
  organizationId: string;
  intent: WorkspaceIntent;
  source: WorkspaceProfileSource;
  schemaVersion: number;
  createdBy?: string;
  createdAt: number;
  updatedAt: number;
};

async function findProfile(
  ctx: { db: { query: (table: string) => unknown } },
  organizationId: string,
): Promise<WorkspaceProfile | null> {
  const query = ctx.db.query("workspaceProfiles") as {
    withIndex: (
      name: string,
      build: (q: { eq: (field: string, value: string) => unknown }) => unknown,
    ) => { unique: () => Promise<WorkspaceProfile | null> };
  };
  return await query
    .withIndex("by_organization", (q) => q.eq("organizationId", organizationId))
    .unique();
}

async function ensureProfile(
  ctx: {
    db: {
      insert: (
        table: string,
        value: Record<string, unknown>,
      ) => Promise<string>;
      query: (table: string) => unknown;
    };
  },
  input: {
    organizationId: string;
    intent: WorkspaceIntent;
    source: WorkspaceProfileSource;
    createdBy?: string;
  },
) {
  if (input.source === "lazyPersonal" && input.intent !== "personal") {
    throw new ConvexError({
      code: "INVALID_WORKSPACE_PROFILE",
      message: "Lazy personal creation requires a personal workspace",
    });
  }
  const existing = await findProfile(ctx, input.organizationId);
  if (existing) {
    if (existing.intent !== input.intent) {
      throw new ConvexError({
        code: "WORKSPACE_INTENT_CONFLICT",
        message: "This workspace already has a different use type",
      });
    }
    return { profileId: existing._id, created: false };
  }
  const now = Date.now();
  const profileId = await ctx.db.insert("workspaceProfiles", {
    organizationId: input.organizationId,
    intent: input.intent,
    source: input.source,
    schemaVersion: WORKSPACE_PROFILE_SCHEMA_VERSION,
    ...(input.createdBy ? { createdBy: input.createdBy } : {}),
    createdAt: now,
    updatedAt: now,
  });
  return { profileId, created: true };
}

export const get = queryGeneric({
  args: { organizationId: v.string() },
  handler: async (ctx, { organizationId }) => {
    await requireOrganizationMember(ctx as never, organizationId);
    return await findProfile(ctx, organizationId);
  },
});

export const completeOnboarding = mutationGeneric({
  args: {
    organizationId: v.string(),
    intent: intentValidator,
    source: sourceValidator,
  },
  handler: async (ctx, input) => {
    const { auth } = await requireOrganizationPermission(
      ctx as never,
      input.organizationId,
      { resource: "organization", action: "update" },
    );
    return await ensureProfile(ctx, { ...input, createdBy: auth.userId });
  },
});

/** Called only by the Better Auth organization lifecycle hook. */
export const upsertFromAuthHook = internalMutationGeneric({
  args: {
    organizationId: v.string(),
    intent: intentValidator,
    source: sourceValidator,
    createdBy: v.string(),
  },
  handler: async (ctx, input) => await ensureProfile(ctx, input),
});

export { ensureProfile, findProfile };

export async function deleteWorkspaceFoundationData(
  ctx: GenericMutationCtx<GenericDataModel>,
  organizationId: string,
): Promise<void> {
  const [profiles, invitations, grants] = await Promise.all([
    ctx.db
      .query("workspaceProfiles")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", organizationId),
      )
      .collect(),
    ctx.db
      .query("pageGuestInvitations")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", organizationId),
      )
      .collect(),
    ctx.db
      .query("pageGuestGrants")
      .withIndex("by_organization_status", (q) =>
        q.eq("organizationId", organizationId),
      )
      .collect(),
  ]);
  for (const row of [...invitations, ...grants, ...profiles]) {
    if (typeof row._id === "string") {
      await ctx.db.delete(row._id as GenericId<string>);
    }
  }
}
