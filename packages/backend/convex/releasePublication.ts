import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { internalMutation } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import { workflows } from "./workflows";

const LEGACY_CLEANUP_BATCH_SIZE = 50;

const legacyCleanupPhase = v.union(
  v.literal("pages"),
  v.literal("libraries"),
  v.literal("folders"),
  v.literal("files"),
  v.literal("search"),
  v.literal("changes"),
);

type LegacyCleanupPhase =
  | "pages"
  | "libraries"
  | "folders"
  | "files"
  | "search"
  | "changes";

const nextLegacyCleanupPhase: Record<
  LegacyCleanupPhase,
  LegacyCleanupPhase | undefined
> = {
  pages: "libraries",
  libraries: "folders",
  folders: "files",
  files: "search",
  search: "changes",
  changes: undefined,
};

async function scheduleLegacyCleanup(
  ctx: Pick<MutationCtx, "scheduler">,
  args: {
    releaseId: Id<"siteReleases">;
    phase: LegacyCleanupPhase;
    cursor?: string;
  },
) {
  await ctx.scheduler.runAfter(
    0,
    internal.releasePublication.cleanupFailedRelease,
    args,
  );
}

/**
 * Compatibility entry point for workflows created before publication became
 * atomic. New releases never use this workflow. Keeping the function path
 * available lets an already queued workflow finish safely after deployment.
 */
export const recover = internalMutation({
  args: { releaseId: v.id("siteReleases") },
  returns: v.null(),
  handler: async (ctx, { releaseId }) => {
    const release = await ctx.db.get(releaseId);
    if (!release || release.publicationStatus === undefined) return null;

    const now = Date.now();
    if (release.publicationStatus === "clearing") {
      const snapshots = await ctx.db
        .query("releaseChanges")
        .withIndex("by_release", (q) => q.eq("releaseId", releaseId))
        .collect();
      const snapshottedChanges = new Map(
        snapshots
          .filter(
            (snapshot) =>
              snapshot.sourceDraftChangeId !== undefined &&
              snapshot.sourceDraftRevision !== undefined,
          )
          .map((snapshot) => [
            snapshot.sourceDraftChangeId!,
            snapshot.sourceDraftRevision!,
          ]),
      );
      const currentChanges = await ctx.db
        .query("draftChanges")
        .withIndex("by_site", (q) => q.eq("siteId", release.siteId))
        .collect();
      for (const change of currentChanges) {
        if (snapshottedChanges.get(change._id) === change.draftRevision) {
          await ctx.db.delete(change._id);
        }
      }
      await ctx.db.patch(releaseId, {
        publicationStatus: "complete",
        publicationFailure: undefined,
        publicationUpdatedAt: now,
      });
      const site = await ctx.db.get(release.siteId);
      if (site?.liveReleaseId === releaseId) {
        await ctx.scheduler.runAfter(
          0,
          internal.publication.projectLiveSearch,
          {
            siteId: site._id,
            expectedLiveReleaseId: releaseId,
            expectedLiveSearchProjectionGeneration:
              site.liveSearchProjectionGeneration,
          },
        );
      }
      return null;
    }

    if (release.publicationStatus === "building") {
      await ctx.db.patch(releaseId, {
        publicationStatus: "failed",
        publicationFailure:
          "The legacy publication was interrupted during the publishing refactor.",
        publicationUpdatedAt: now,
      });
      await scheduleLegacyCleanup(ctx, {
        releaseId,
        phase: "pages",
      });
    }
    return null;
  },
});

/**
 * Removes partial snapshots left by an interrupted legacy build without
 * placing a large cleanup in one transaction. The failed release row remains
 * as an audit record and is never made readable by the publication surface.
 */
async function readLegacyCleanupPage(
  ctx: MutationCtx,
  releaseId: Id<"siteReleases">,
  phase: LegacyCleanupPhase,
  cursor: string | undefined,
) {
  const paginationOpts = {
    cursor: cursor ?? null,
    numItems: LEGACY_CLEANUP_BATCH_SIZE,
  };
  switch (phase) {
    case "pages":
      return ctx.db
        .query("releasePages")
        .withIndex("by_release", (q) => q.eq("releaseId", releaseId))
        .paginate(paginationOpts);
    case "libraries":
      return ctx.db
        .query("releaseLibraries")
        .withIndex("by_release", (q) => q.eq("releaseId", releaseId))
        .paginate(paginationOpts);
    case "folders":
      return ctx.db
        .query("releaseFolders")
        .withIndex("by_release", (q) => q.eq("releaseId", releaseId))
        .paginate(paginationOpts);
    case "files":
      return ctx.db
        .query("releaseFiles")
        .withIndex("by_release", (q) => q.eq("releaseId", releaseId))
        .paginate(paginationOpts);
    case "search":
      return ctx.db
        .query("searchEntries")
        .withIndex("by_scope", (q) => q.eq("scopeId", `release:${releaseId}`))
        .paginate(paginationOpts);
    case "changes":
      return ctx.db
        .query("releaseChanges")
        .withIndex("by_release", (q) => q.eq("releaseId", releaseId))
        .paginate(paginationOpts);
  }
}

export const cleanupFailedRelease = internalMutation({
  args: {
    releaseId: v.id("siteReleases"),
    phase: legacyCleanupPhase,
    cursor: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, { releaseId, phase, cursor }) => {
    const release = await ctx.db.get(releaseId);
    if (release?.publicationStatus !== "failed") return null;

    const page = await readLegacyCleanupPage(ctx, releaseId, phase, cursor);

    for (const row of page.page) await ctx.db.delete(row._id);
    if (!page.isDone) {
      await scheduleLegacyCleanup(ctx, {
        releaseId,
        phase,
        cursor: page.continueCursor,
      });
      return null;
    }

    const nextPhase = nextLegacyCleanupPhase[phase];
    if (nextPhase) {
      await scheduleLegacyCleanup(ctx, { releaseId, phase: nextPhase });
    }
    return null;
  },
});

export const run = workflows
  .define({ args: { releaseId: v.id("siteReleases") } })
  .handler(async (step, { releaseId }): Promise<void> => {
    await step.runMutation(internal.releasePublication.recover, {
      releaseId,
    });
  });
