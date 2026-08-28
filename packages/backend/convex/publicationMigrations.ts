import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import {
  internalMutation,
  internalQuery,
  type QueryCtx,
  type MutationCtx,
} from "./_generated/server";
import {
  extractOpenEditorText,
  parseOpenEditorDocument,
} from "./pageContentFormat";
import { fileSourceVersion } from "./model/fileExtraction";
import { readContentRevisionSearchText } from "./model/contentObjects";
import { truncateDescription } from "./publication";

const PUBLICATION_MIGRATION_KEY = "publication-manifest-v1";
const BATCH_SIZE = 8;

type MigrationPhase = "revisions" | "pages" | "files" | "search" | "sites";
type MigrationMode = "dryRun" | "apply";
type MigrationRun = Doc<"publicationMigrationRuns">;

function nextPhase(phase: MigrationPhase): MigrationPhase | undefined {
  switch (phase) {
    case "revisions":
      return "pages";
    case "pages":
      return "files";
    case "files":
      return "search";
    case "search":
      return "sites";
    case "sites":
      return undefined;
  }
}

async function findRun(
  ctx: Pick<QueryCtx, "db">,
  runId: string,
): Promise<MigrationRun | null> {
  return await ctx.db
    .query("publicationMigrationRuns")
    .withIndex("by_migration_run", (q) =>
      q.eq("migrationKey", PUBLICATION_MIGRATION_KEY).eq("runId", runId),
    )
    .unique();
}

type Counters = {
  scannedCount: number;
  migratedCount: number;
  skippedCount: number;
  scheduledCount: number;
  errorCount: number;
};

type Page<T> = {
  page: T[];
  isDone: boolean;
  continueCursor: string;
};

function advance(
  run: MigrationRun,
  page: { isDone: boolean; continueCursor: string },
  counters: Counters,
  now: number,
) {
  const phase = page.isDone ? nextPhase(run.phase) : run.phase;
  const completed = page.isDone && phase === undefined;
  return {
    ...counters,
    phase: phase ?? run.phase,
    cursor: page.isDone ? undefined : page.continueCursor,
    status: completed ? ("completed" as const) : ("running" as const),
    ...(completed ? { completedAt: now } : {}),
  };
}

function countScanned(counters: Counters, amount: number): Counters {
  return { ...counters, scannedCount: counters.scannedCount + amount };
}

function countersFromRun(run: MigrationRun): Counters {
  return {
    scannedCount: run.scannedCount,
    migratedCount: run.migratedCount,
    skippedCount: run.skippedCount,
    scheduledCount: run.scheduledCount ?? 0,
    errorCount: run.errorCount,
  };
}

async function migrateRevisions(
  ctx: MutationCtx,
  run: MigrationRun,
): Promise<ReturnType<typeof advance>> {
  const page = (await ctx.db
    .query("contentRevisions")
    .paginate({ cursor: run.cursor ?? null, numItems: BATCH_SIZE })) as Page<
    Doc<"contentRevisions">
  >;
  let counters = countScanned(countersFromRun(run), page.page.length);
  for (const revision of page.page) {
    if (revision.searchText !== undefined) {
      counters = { ...counters, skippedCount: counters.skippedCount + 1 };
      continue;
    }
    const payload = await ctx.db.get(revision.payloadId);
    if (!payload || payload.siteId !== revision.siteId) {
      throw new Error(
        `Content payload is missing for revision ${revision._id}`,
      );
    }
    const searchText = extractOpenEditorText(
      parseOpenEditorDocument(payload.content),
    );
    if (run.mode === "apply") {
      await ctx.db.patch(revision._id, { searchText });
    }
    counters = { ...counters, migratedCount: counters.migratedCount + 1 };
  }
  return advance(run, page, counters, Date.now());
}

async function migrateReleasePages(
  ctx: MutationCtx,
  run: MigrationRun,
): Promise<ReturnType<typeof advance>> {
  const page = (await ctx.db
    .query("releasePages")
    .paginate({ cursor: run.cursor ?? null, numItems: BATCH_SIZE })) as Page<
    Doc<"releasePages">
  >;
  let counters = countScanned(countersFromRun(run), page.page.length);
  for (const releasePage of page.page) {
    if (releasePage.description !== undefined) {
      counters = { ...counters, skippedCount: counters.skippedCount + 1 };
      continue;
    }
    const contentText = await readContentRevisionSearchText(
      ctx,
      releasePage.contentRevisionId,
    );
    const description = truncateDescription(
      contentText || releasePage.descriptionText || "",
    );
    if (run.mode === "apply") {
      await ctx.db.patch(releasePage._id, { description });
    }
    counters = { ...counters, migratedCount: counters.migratedCount + 1 };
  }
  return advance(run, page, counters, Date.now());
}

async function readHistoricalFileText(
  ctx: MutationCtx,
  releaseFile: Doc<"releaseFiles">,
): Promise<string> {
  const legacyEntry = await ctx.db
    .query("searchEntries")
    .withIndex("by_scope_source", (q) =>
      q
        .eq("scopeId", `release:${releaseFile.releaseId}`)
        .eq("kind", "file")
        .eq("sourceId", releaseFile.fileId),
    )
    .unique();
  if (
    legacyEntry &&
    legacyEntry.siteId === releaseFile.siteId &&
    (legacyEntry.releaseId === undefined ||
      legacyEntry.releaseId === releaseFile.releaseId)
  ) {
    return legacyEntry.text;
  }

  const file = await ctx.db.get(releaseFile.fileId);
  if (
    file?.siteId !== releaseFile.siteId ||
    file.kind !== "file" ||
    file.deletedAt !== undefined ||
    file.objectKey !== releaseFile.objectKey ||
    file.size !== releaseFile.size ||
    file.checksum !== releaseFile.checksum
  ) {
    return "";
  }
  const extraction = await ctx.db
    .query("fileExtractions")
    .withIndex("by_file", (q) => q.eq("fileId", releaseFile.fileId))
    .unique();
  return extraction?.status === "ready" &&
    extraction.sourceVersion === fileSourceVersion(file)
    ? (extraction.extractedText ?? "")
    : "";
}

async function migrateReleaseFiles(
  ctx: MutationCtx,
  run: MigrationRun,
): Promise<ReturnType<typeof advance>> {
  const page = (await ctx.db
    .query("releaseFiles")
    .paginate({ cursor: run.cursor ?? null, numItems: BATCH_SIZE })) as Page<
    Doc<"releaseFiles">
  >;
  let counters = countScanned(countersFromRun(run), page.page.length);
  for (const releaseFile of page.page) {
    if (
      releaseFile.kind !== "file" ||
      releaseFile.extractedText !== undefined
    ) {
      counters = { ...counters, skippedCount: counters.skippedCount + 1 };
      continue;
    }
    const extractedText = await readHistoricalFileText(ctx, releaseFile);
    if (run.mode === "apply") {
      await ctx.db.patch(releaseFile._id, { extractedText });
    }
    counters = { ...counters, migratedCount: counters.migratedCount + 1 };
  }
  return advance(run, page, counters, Date.now());
}

async function migrateSearchEntries(
  ctx: MutationCtx,
  run: MigrationRun,
): Promise<ReturnType<typeof advance>> {
  const page = (await ctx.db
    .query("searchEntries")
    .paginate({ cursor: run.cursor ?? null, numItems: BATCH_SIZE })) as Page<
    Doc<"searchEntries">
  >;
  let counters = countScanned(countersFromRun(run), page.page.length);
  for (const entry of page.page) {
    if (
      !entry.scopeId.startsWith("release:") ||
      entry.releaseId !== undefined
    ) {
      counters = { ...counters, skippedCount: counters.skippedCount + 1 };
      continue;
    }
    const releaseId = ctx.db.normalizeId(
      "siteReleases",
      entry.scopeId.slice("release:".length),
    );
    if (!releaseId) {
      throw new Error(
        `Release search entry points to a missing release: ${entry._id}`,
      );
    }
    const release = await ctx.db.get(releaseId);
    if (!release || release.siteId !== entry.siteId) {
      throw new Error(`Release search entry has the wrong site: ${entry._id}`);
    }
    if (run.mode === "apply") {
      await ctx.db.patch(entry._id, { releaseId });
    }
    counters = { ...counters, migratedCount: counters.migratedCount + 1 };
  }
  return advance(run, page, counters, Date.now());
}

async function migrateLiveSites(
  ctx: MutationCtx,
  run: MigrationRun,
): Promise<ReturnType<typeof advance>> {
  const page = (await ctx.db
    .query("sites")
    .paginate({ cursor: run.cursor ?? null, numItems: BATCH_SIZE })) as Page<
    Doc<"sites">
  >;
  let counters = countScanned(countersFromRun(run), page.page.length);
  for (const site of page.page) {
    if (!site.liveReleaseId) {
      counters = { ...counters, skippedCount: counters.skippedCount + 1 };
      continue;
    }
    const release = await ctx.db.get(site.liveReleaseId);
    if (!release || release.siteId !== site._id) {
      throw new Error(`Live release is missing for site ${site._id}`);
    }
    counters = {
      ...counters,
      scheduledCount: counters.scheduledCount + 1,
    };
    if (run.mode === "apply") {
      const generation = (site.liveSearchProjectionGeneration ?? 0) + 1;
      await ctx.db.patch(site._id, {
        liveSearchProjectionGeneration: generation,
      });
      await ctx.scheduler.runAfter(0, internal.publication.projectLiveSearch, {
        siteId: site._id,
        expectedLiveReleaseId: site.liveReleaseId,
        expectedLiveSearchProjectionGeneration: generation,
      });
      counters = {
        ...counters,
        migratedCount: counters.migratedCount + 1,
      };
    } else if (site.liveSearchProjectionGeneration === undefined) {
      counters = {
        ...counters,
        migratedCount: counters.migratedCount + 1,
      };
    } else {
      counters = { ...counters, skippedCount: counters.skippedCount + 1 };
    }
  }
  return advance(run, page, counters, Date.now());
}

async function processPhase(ctx: MutationCtx, run: MigrationRun) {
  switch (run.phase) {
    case "revisions":
      return await migrateRevisions(ctx, run);
    case "pages":
      return await migrateReleasePages(ctx, run);
    case "files":
      return await migrateReleaseFiles(ctx, run);
    case "search":
      return await migrateSearchEntries(ctx, run);
    case "sites":
      return await migrateLiveSites(ctx, run);
  }
}

async function createRun(
  ctx: MutationCtx,
  runId: string,
  mode: MigrationMode,
): Promise<MigrationRun> {
  const now = Date.now();
  const id = await ctx.db.insert("publicationMigrationRuns", {
    migrationKey: PUBLICATION_MIGRATION_KEY,
    runId,
    mode,
    phase: "revisions",
    status: "running",
    scannedCount: 0,
    migratedCount: 0,
    skippedCount: 0,
    scheduledCount: 0,
    errorCount: 0,
    startedAt: now,
    updatedAt: now,
  });
  const run = await ctx.db.get(id);
  if (!run) throw new Error("Publication migration run was not created");
  return run;
}

export const runBatch = internalMutation({
  args: {
    runId: v.string(),
    mode: v.union(v.literal("dryRun"), v.literal("apply")),
  },
  returns: v.any(),
  handler: async (ctx, { runId, mode }) => {
    const existing = await findRun(ctx, runId);
    if (existing?.mode !== undefined && existing.mode !== mode) {
      throw new Error("A migration run cannot change mode");
    }
    if (existing?.status === "completed") return existing;
    const run = existing ?? (await createRun(ctx, runId, mode));

    try {
      const update = await processPhase(ctx, run);
      await ctx.db.patch(run._id, {
        ...update,
        failureSummary: undefined,
        updatedAt: Date.now(),
      });
      if (update.status === "running") {
        await ctx.scheduler.runAfter(
          0,
          internal.publicationMigrations.runBatch,
          {
            runId,
            mode,
          },
        );
      }
      return await ctx.db.get(run._id);
    } catch (error) {
      const failureSummary =
        error instanceof Error ? error.message : String(error);
      await ctx.db.patch(run._id, {
        status: "failed",
        phase: run.phase,
        errorCount: run.errorCount + 1,
        failureSummary,
        updatedAt: Date.now(),
      });
      return await ctx.db.get(run._id);
    }
  },
});

export const getReport = internalQuery({
  args: { runId: v.string() },
  returns: v.any(),
  handler: async (ctx, { runId }) => await findRun(ctx, runId),
});
