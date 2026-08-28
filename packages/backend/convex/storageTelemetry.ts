import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { internalMutation, query, type MutationCtx } from "./_generated/server";
import { requireOrganizationMember } from "./permissions";

const FILE_BATCH_SIZE = 100;
const PAYLOAD_BATCH_SIZE = 8;
const REVISION_BATCH_SIZE = 100;

type ReconciliationPhase = "sites" | "files" | "payloads" | "revisions";

type ReconciliationState = {
  siteCursor: string | null;
  siteId: Id<"sites"> | null;
  phase: ReconciliationPhase;
  tableCursor: string | null;
};

function initialReconciliationState(): ReconciliationState {
  return {
    siteCursor: null,
    siteId: null,
    phase: "sites",
    tableCursor: null,
  };
}

function encodeReconciliationState(state: ReconciliationState) {
  return JSON.stringify(state);
}

function decodeReconciliationState(cursor?: string): ReconciliationState {
  if (!cursor) return initialReconciliationState();

  let value: unknown;
  try {
    value = JSON.parse(cursor);
  } catch {
    throw new Error("Invalid storage reconciliation cursor");
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Invalid storage reconciliation cursor");
  }

  const record = value as Record<string, unknown>;
  const phase = record.phase;
  if (
    phase !== "sites" &&
    phase !== "files" &&
    phase !== "payloads" &&
    phase !== "revisions"
  ) {
    throw new Error("Invalid storage reconciliation phase");
  }

  const siteId = record.siteId;
  if (siteId !== null && typeof siteId !== "string") {
    throw new Error("Invalid storage reconciliation site");
  }

  return {
    siteCursor:
      typeof record.siteCursor === "string" ? record.siteCursor : null,
    siteId: siteId === null ? null : (siteId as Id<"sites">),
    phase,
    tableCursor:
      typeof record.tableCursor === "string" ? record.tableCursor : null,
  };
}

async function completeReconciliation(
  ctx: MutationCtx,
  run: Doc<"storageTelemetryReconciliations">,
) {
  const now = Date.now();
  const activeFileBytes = run.observedActiveFileBytes;
  const retainedFileBytes = run.observedRetainedFileBytes;
  const contentPayloadBytes = run.observedContentPayloadBytes;
  const logicalRevisionBytes = run.observedLogicalRevisionBytes;
  const activeFileCount = run.observedActiveFileCount ?? 0;
  const retainedFileCount = run.observedRetainedFileCount ?? 0;
  const contentPayloadCount = run.observedContentPayloadCount ?? 0;
  const value = {
    organizationId: run.organizationId,
    activeFileBytes,
    retainedFileBytes,
    contentPayloadBytes,
    logicalRevisionBytes,
    activeFileCount,
    retainedFileCount,
    contentPayloadCount,
    lastReconciledAt: now,
    reconciliationVersion: "storage-v1",
    updatedAt: now,
  };

  const current = await ctx.db
    .query("workspaceStorageUsage")
    .withIndex("by_organization", (q) =>
      q.eq("organizationId", run.organizationId),
    )
    .unique();
  if (current) await ctx.db.patch(current._id, value);
  else
    await ctx.db.insert("workspaceStorageUsage", { ...value, createdAt: now });

  await ctx.db.patch(run._id, {
    status: "completed",
    cursor: undefined,
    completedAt: now,
    updatedAt: now,
  });
  return value;
}

export const getWorkspaceUsage = query({
  args: { organizationId: v.string() },
  handler: async (ctx, { organizationId }) => {
    await requireOrganizationMember(ctx, organizationId);
    return await ctx.db
      .query("workspaceStorageUsage")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", organizationId),
      )
      .unique();
  },
});

export const reconcileWorkspace = internalMutation({
  args: { organizationId: v.string() },
  handler: async (ctx, { organizationId }) => {
    const now = Date.now();
    const runId = await ctx.db.insert("storageTelemetryReconciliations", {
      organizationId,
      status: "running",
      observedActiveFileBytes: 0n,
      observedRetainedFileBytes: 0n,
      observedContentPayloadBytes: 0n,
      observedLogicalRevisionBytes: 0n,
      observedActiveFileCount: 0,
      observedRetainedFileCount: 0,
      observedContentPayloadCount: 0,
      reconciliationVersion: "storage-v1",
      startedAt: now,
      updatedAt: now,
    });
    await ctx.scheduler.runAfter(
      0,
      internal.storageTelemetry.reconcileWorkspaceBatch,
      { runId },
    );
    return { runId, status: "running" as const };
  },
});

export const reconcileWorkspaceBatch = internalMutation({
  args: { runId: v.id("storageTelemetryReconciliations") },
  handler: async (ctx, { runId }) => {
    const run = await ctx.db.get(runId);
    if (run?.status !== "running") return run;

    try {
      let state = decodeReconciliationState(run.cursor);
      if (state.phase === "sites") {
        const sites = await ctx.db
          .query("sites")
          .withIndex("by_organization", (q) =>
            q.eq("organizationId", run.organizationId),
          )
          .paginate({ cursor: state.siteCursor, numItems: 1 });
        const site = sites.page[0];
        if (!site) return await completeReconciliation(ctx, run);
        state = {
          siteCursor: sites.isDone ? null : sites.continueCursor,
          siteId: site._id,
          phase: "files",
          tableCursor: null,
        };
        await ctx.db.patch(runId, {
          cursor: encodeReconciliationState(state),
          updatedAt: Date.now(),
        });
        await ctx.scheduler.runAfter(
          0,
          internal.storageTelemetry.reconcileWorkspaceBatch,
          { runId },
        );
        return { runId, status: "running" as const };
      }

      if (!state.siteId)
        throw new Error("Missing site in storage reconciliation");

      if (state.phase === "files") {
        const page = await ctx.db
          .query("files")
          .withIndex("by_site", (q) => q.eq("siteId", state.siteId!))
          .paginate({ cursor: state.tableCursor, numItems: FILE_BATCH_SIZE });
        let activeFileBytes = run.observedActiveFileBytes;
        let retainedFileBytes = run.observedRetainedFileBytes;
        let activeFileCount = run.observedActiveFileCount ?? 0;
        let retainedFileCount = run.observedRetainedFileCount ?? 0;
        for (const file of page.page) {
          if (file.deletedAt === undefined) {
            activeFileBytes += BigInt(file.size);
            activeFileCount += 1;
          } else {
            retainedFileBytes += BigInt(file.size);
            retainedFileCount += 1;
          }
        }
        await ctx.db.patch(runId, {
          observedActiveFileBytes: activeFileBytes,
          observedRetainedFileBytes: retainedFileBytes,
          observedActiveFileCount: activeFileCount,
          observedRetainedFileCount: retainedFileCount,
        });
        state = page.isDone
          ? { ...state, phase: "payloads", tableCursor: null }
          : { ...state, tableCursor: page.continueCursor };
      } else if (state.phase === "payloads") {
        const page = await ctx.db
          .query("contentPayloads")
          .withIndex("by_site_hash", (q) => q.eq("siteId", state.siteId!))
          .paginate({
            cursor: state.tableCursor,
            numItems: PAYLOAD_BATCH_SIZE,
          });
        let contentPayloadBytes = run.observedContentPayloadBytes;
        let contentPayloadCount = run.observedContentPayloadCount ?? 0;
        for (const payload of page.page) {
          contentPayloadBytes += BigInt(payload.contentSize);
          contentPayloadCount += 1;
        }
        await ctx.db.patch(runId, {
          observedContentPayloadBytes: contentPayloadBytes,
          observedContentPayloadCount: contentPayloadCount,
        });
        state = page.isDone
          ? { ...state, phase: "revisions", tableCursor: null }
          : { ...state, tableCursor: page.continueCursor };
      } else if (state.phase === "revisions") {
        const page = await ctx.db
          .query("contentRevisions")
          .withIndex("by_site_hash", (q) => q.eq("siteId", state.siteId!))
          .paginate({
            cursor: state.tableCursor,
            numItems: REVISION_BATCH_SIZE,
          });
        let logicalRevisionBytes = run.observedLogicalRevisionBytes;
        for (const revision of page.page) {
          logicalRevisionBytes += BigInt(revision.contentSize);
        }
        await ctx.db.patch(runId, {
          observedLogicalRevisionBytes: logicalRevisionBytes,
        });
        state = page.isDone
          ? {
              ...state,
              phase: "sites",
              siteId: null,
              tableCursor: null,
            }
          : { ...state, tableCursor: page.continueCursor };
      }

      const updatedRun = await ctx.db.get(runId);
      if (updatedRun?.status !== "running") return updatedRun;
      await ctx.db.patch(runId, {
        cursor: encodeReconciliationState(state),
        updatedAt: Date.now(),
      });
      await ctx.scheduler.runAfter(
        0,
        internal.storageTelemetry.reconcileWorkspaceBatch,
        { runId },
      );
      return { runId, status: "running" as const };
    } catch (error) {
      await ctx.db.patch(runId, {
        status: "failed",
        failureCode: error instanceof Error ? error.name : "UNKNOWN",
        completedAt: Date.now(),
        updatedAt: Date.now(),
      });
      throw error;
    }
  },
});
