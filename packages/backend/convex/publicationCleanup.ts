import {
  cleanup as cleanupWorkflow,
  getStatus,
  type WorkflowId,
  type WorkflowStatus,
} from "@convex-dev/workflow";
import { v } from "convex/values";
import { components, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { internalMutation } from "./_generated/server";

const CLEANUP_BATCH_SIZE = 25;

const cleanupPhase = v.union(
  v.literal("releases"),
  v.literal("pages"),
  v.literal("search"),
  v.literal("migrationRuns"),
);

type CleanupPhase = "releases" | "pages" | "search" | "migrationRuns";

const nextPhase: Record<CleanupPhase, CleanupPhase | undefined> = {
  releases: "pages",
  pages: "search",
  search: "migrationRuns",
  migrationRuns: undefined,
};

async function scheduleNext(
  ctx: Pick<MutationCtx, "scheduler">,
  args: { phase: CleanupPhase; cursor?: string },
) {
  await ctx.scheduler.runAfter(0, internal.publicationCleanup.run, args);
}

async function assertReleaseHasNoReferences(
  ctx: MutationCtx,
  releaseId: Id<"siteReleases">,
  siteId: Id<"sites">,
): Promise<void> {
  const siteReference = await ctx.db
    .query("sites")
    .filter((q) =>
      q.or(
        q.eq(q.field("liveReleaseId"), releaseId),
        q.eq(q.field("draftBaseReleaseId"), releaseId),
      ),
    )
    .first();
  const successor = await ctx.db
    .query("siteReleases")
    .filter((q) => q.eq(q.field("previousReleaseId"), releaseId))
    .first();
  const [page, library, folder, file, change] = await Promise.all([
    ctx.db
      .query("releasePages")
      .withIndex("by_release", (q) => q.eq("releaseId", releaseId))
      .first(),
    ctx.db
      .query("releaseLibraries")
      .withIndex("by_release", (q) => q.eq("releaseId", releaseId))
      .first(),
    ctx.db
      .query("releaseFolders")
      .withIndex("by_release", (q) => q.eq("releaseId", releaseId))
      .first(),
    ctx.db
      .query("releaseFiles")
      .withIndex("by_release", (q) => q.eq("releaseId", releaseId))
      .first(),
    ctx.db
      .query("releaseChanges")
      .withIndex("by_release", (q) => q.eq("releaseId", releaseId))
      .first(),
  ]);
  const event = (await ctx.db
    .query("publicationEvents")
    .withIndex("by_site", (q) => q.eq("siteId", siteId))
    .filter((q) =>
      q.or(
        q.eq(q.field("fromReleaseId"), releaseId),
        q.eq(q.field("toReleaseId"), releaseId),
      ),
    )
    .first()) as unknown;

  if (
    siteReference ||
    successor ||
    page ||
    library ||
    folder ||
    file ||
    change ||
    event
  ) {
    throw new Error(`Failed release ${releaseId} still has references`);
  }
}

async function cleanupWorkflowStorage(
  ctx: MutationCtx,
  workflowId: string,
): Promise<void> {
  const typedWorkflowId = workflowId as WorkflowId;
  let status: WorkflowStatus;
  try {
    status = await getStatus(ctx, components.workflow, typedWorkflowId);
  } catch (error) {
    if (error instanceof Error && error.message.includes("not found")) {
      return;
    }
    throw error;
  }
  if (status.type === "inProgress") {
    throw new Error(
      `Legacy publication workflow ${workflowId} is still active`,
    );
  }
  await cleanupWorkflow(ctx, components.workflow, typedWorkflowId);
}

export const run = internalMutation({
  args: {
    phase: cleanupPhase,
    cursor: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, { phase, cursor }) => {
    if (phase === "releases") {
      const page = await ctx.db
        .query("siteReleases")
        .paginate({ cursor: cursor ?? null, numItems: CLEANUP_BATCH_SIZE });
      for (const release of page.page) {
        if (release.publicationStatus === "failed") {
          await assertReleaseHasNoReferences(ctx, release._id, release.siteId);
          if (release.publicationWorkflowId) {
            await cleanupWorkflowStorage(ctx, release.publicationWorkflowId);
          }
          await ctx.db.delete(release._id);
          continue;
        }
        if (
          release.publicationStatus !== undefined ||
          release.publicationFailure !== undefined ||
          release.publicationWorkflowId !== undefined ||
          release.publicationUpdatedAt !== undefined
        ) {
          if (release.publicationWorkflowId) {
            await cleanupWorkflowStorage(ctx, release.publicationWorkflowId);
          }
          await ctx.db.patch(release._id, {
            publicationStatus: undefined,
            publicationFailure: undefined,
            publicationWorkflowId: undefined,
            publicationUpdatedAt: undefined,
          });
        }
      }
      if (!page.isDone) {
        await scheduleNext(ctx, { phase, cursor: page.continueCursor });
      } else {
        await scheduleNext(ctx, { phase: nextPhase[phase]! });
      }
      return null;
    }

    if (phase === "pages") {
      const page = await ctx.db
        .query("releasePages")
        .paginate({ cursor: cursor ?? null, numItems: CLEANUP_BATCH_SIZE });
      for (const releasePage of page.page) {
        if (releasePage.descriptionText !== undefined) {
          await ctx.db.patch(releasePage._id, { descriptionText: undefined });
        }
      }
      if (!page.isDone) {
        await scheduleNext(ctx, { phase, cursor: page.continueCursor });
      } else {
        await scheduleNext(ctx, { phase: nextPhase[phase]! });
      }
      return null;
    }

    if (phase === "search") {
      const page = await ctx.db
        .query("searchEntries")
        .paginate({ cursor: cursor ?? null, numItems: CLEANUP_BATCH_SIZE });
      for (const entry of page.page) {
        if (
          entry.scopeId.startsWith("release:") ||
          entry.scopeId.startsWith("site:")
        ) {
          await ctx.db.delete(entry._id);
        }
      }
      if (!page.isDone) {
        await scheduleNext(ctx, { phase, cursor: page.continueCursor });
      } else {
        await scheduleNext(ctx, { phase: nextPhase[phase]! });
      }
      return null;
    }

    const page = await ctx.db
      .query("publicationMigrationRuns")
      .paginate({ cursor: cursor ?? null, numItems: CLEANUP_BATCH_SIZE });
    for (const run of page.page) await ctx.db.delete(run._id);
    if (!page.isDone) {
      await scheduleNext(ctx, { phase, cursor: page.continueCursor });
    }
    return null;
  },
});
