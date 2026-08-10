import { internalMutationGeneric, internalQueryGeneric } from "convex/server";
import { v } from "convex/values";
import type { GenericId } from "convex/values";
import { components } from "./_generated/api";
import {
  WORKSPACE_INTENT_MIGRATION_KEY,
  WORKSPACE_PROFILE_SCHEMA_VERSION,
  classifyWorkspaceIntent,
} from "./model/workspaceFoundation";

const BATCH_SIZE = 50;

type AuthOrganization = { _id: string };
type AuthMemberPage = {
  page: unknown[];
  isDone: boolean;
  continueCursor: string;
};
type AuthOrganizationPage = {
  page: AuthOrganization[];
  isDone: boolean;
  continueCursor: string;
};
type MigrationRun = {
  _id: string;
  migrationKey: string;
  runId: string;
  mode: "dryRun" | "apply";
  status: "running" | "completed" | "failed";
  checkpoint?: string;
  scannedCount: number;
  personalCount: number;
  workCount: number;
  createdCount: number;
  skippedCount: number;
  errorCount: number;
  startedAt: number;
  updatedAt: number;
  completedAt?: number;
  failureSummary?: string;
};

async function findRun(
  ctx: { db: { query: (table: string) => unknown } },
  runId: string,
): Promise<MigrationRun | null> {
  const query = ctx.db.query("workspaceMigrationRuns") as {
    withIndex: (
      name: string,
      build: (q: {
        eq: (
          field: string,
          value: string,
        ) => {
          eq: (nextField: string, nextValue: string) => unknown;
        };
      }) => unknown,
    ) => { unique: () => Promise<MigrationRun | null> };
  };
  return await query
    .withIndex("by_migration_run", (q) =>
      q.eq("migrationKey", WORKSPACE_INTENT_MIGRATION_KEY).eq("runId", runId),
    )
    .unique();
}

async function countOrganizationMembers(
  ctx: { runQuery: (reference: unknown, args: unknown) => Promise<unknown> },
  organizationId: string,
): Promise<number> {
  let cursor: string | null = null;
  let count = 0;
  do {
    const result = (await ctx.runQuery(components.betterAuth.adapter.findMany, {
      model: "member",
      where: [
        { field: "organizationId", operator: "eq", value: organizationId },
      ],
      paginationOpts: { numItems: 250, cursor },
    })) as AuthMemberPage;
    count += result.page.length;
    cursor = result.isDone ? null : result.continueCursor;
  } while (cursor !== null);
  return count;
}

export const runBatch = internalMutationGeneric({
  args: {
    runId: v.string(),
    mode: v.union(v.literal("dryRun"), v.literal("apply")),
  },
  handler: async (ctx, { runId, mode }) => {
    const existingRun = await findRun(ctx, runId);
    if (existingRun?.mode !== undefined && existingRun.mode !== mode) {
      throw new Error("A migration run cannot change mode");
    }
    if (existingRun?.status === "completed") return existingRun;

    const now = Date.now();
    const cursor = existingRun?.checkpoint ?? null;
    const organizations = (await ctx.runQuery(
      components.betterAuth.adapter.findMany,
      {
        model: "organization",
        where: [],
        paginationOpts: { numItems: BATCH_SIZE, cursor },
      },
    )) as AuthOrganizationPage;

    const counters = {
      scannedCount: existingRun?.scannedCount ?? 0,
      personalCount: existingRun?.personalCount ?? 0,
      workCount: existingRun?.workCount ?? 0,
      createdCount: existingRun?.createdCount ?? 0,
      skippedCount: existingRun?.skippedCount ?? 0,
      errorCount: existingRun?.errorCount ?? 0,
    };

    for (const organization of organizations.page) {
      counters.scannedCount += 1;
      const profile = await ctx.db
        .query("workspaceProfiles")
        .withIndex("by_organization", (q) =>
          q.eq("organizationId", organization._id),
        )
        .unique();
      if (profile) {
        counters.skippedCount += 1;
        continue;
      }
      const memberCount = await countOrganizationMembers(
        ctx as unknown as {
          runQuery: (reference: unknown, args: unknown) => Promise<unknown>;
        },
        organization._id,
      );
      const intent = classifyWorkspaceIntent(memberCount);
      if (!intent) {
        counters.errorCount += 1;
        continue;
      }
      if (intent === "personal") counters.personalCount += 1;
      else counters.workCount += 1;

      if (mode === "apply") {
        const insertedAt = Date.now();
        await ctx.db.insert("workspaceProfiles", {
          organizationId: organization._id,
          intent,
          source: "migration",
          schemaVersion: WORKSPACE_PROFILE_SCHEMA_VERSION,
          createdAt: insertedAt,
          updatedAt: insertedAt,
        });
        counters.createdCount += 1;
      }
    }

    const completed = organizations.isDone;
    const update = {
      migrationKey: WORKSPACE_INTENT_MIGRATION_KEY,
      runId,
      mode,
      status: completed ? ("completed" as const) : ("running" as const),
      ...(completed ? {} : { checkpoint: organizations.continueCursor }),
      ...counters,
      startedAt: existingRun?.startedAt ?? now,
      updatedAt: now,
      ...(completed ? { completedAt: now } : {}),
    };
    if (existingRun) {
      await ctx.db.replace(
        existingRun._id as GenericId<"workspaceMigrationRuns">,
        update,
      );
    } else await ctx.db.insert("workspaceMigrationRuns", update);
    return update;
  },
});

export const getReport = internalQueryGeneric({
  args: { runId: v.string() },
  handler: async (ctx, { runId }) => await findRun(ctx, runId),
});
