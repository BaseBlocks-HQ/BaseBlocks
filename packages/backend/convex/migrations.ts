import {
  generateSlug,
  SLUG_PATTERN,
  uniqueSlugAmong,
} from "@baseblocks/domain";
import type { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { internalMutation, internalQuery } from "./_generated/server";
import { touchSiteDraft } from "./model/draft";
import { v } from "convex/values";
import { queueFileExtraction } from "./fileExtraction";

const canonicalPageSlugPattern = new RegExp(`^${SLUG_PATTERN}$`);
const FILE_EXTRACTION_BACKFILL_KEY = "file-extraction-v1";
const RELEASE_PUBLICATION_STATUS_BACKFILL_KEY = "release-publication-status-v1";
const DRAFT_CHANGE_REVISION_BACKFILL_KEY = "draft-change-revision-v1";
const RELEASE_CHANGE_TIMESTAMP_CLEANUP_KEY = "release-change-timestamp-v1";
const BACKFILL_STALL_MS = 10 * 60_000;

export const getStatus = internalQuery({
  args: {},
  handler: async (ctx) => {
    const jobs = await ctx.db
      .query("maintenanceJobs")
      .withIndex("by_key")
      .collect();
    return jobs.map(
      ({ key, status, processed, updated, updatedAt, completedAt }) => ({
        key,
        status,
        processed,
        updated,
        updatedAt,
        completedAt,
      }),
    );
  },
});

export const removeCompletedMigrationJobs = internalMutation({
  args: {},
  handler: async (ctx) => {
    for (const status of ["building", "aborting", "clearing"] as const) {
      const active = await ctx.db
        .query("siteReleases")
        .withIndex("by_publication_status_updated", (q) =>
          q.eq("publicationStatus", status),
        )
        .first();
      if (active) throw new Error("A publication is still active");
    }
    for (const status of ["validating", "applying", "paused"] as const) {
      const active = await ctx.db
        .query("draftRestores")
        .withIndex("by_status_updated", (q) => q.eq("status", status))
        .first();
      if (active) throw new Error("A draft restore is still active");
    }
    const extractionJob = await ctx.db.query("fileExtractionJobs").first();
    if (extractionJob) throw new Error("File extraction jobs are still active");
    for (const status of ["queued", "processing"] as const) {
      const active = await ctx.db
        .query("fileExtractions")
        .filter((q) => q.eq(q.field("status"), status))
        .first();
      if (active) throw new Error("File extraction is still active");
    }
    const requiredKeys = [
      FILE_EXTRACTION_BACKFILL_KEY,
      RELEASE_PUBLICATION_STATUS_BACKFILL_KEY,
      DRAFT_CHANGE_REVISION_BACKFILL_KEY,
      RELEASE_CHANGE_TIMESTAMP_CLEANUP_KEY,
    ];
    const jobs = await ctx.db
      .query("maintenanceJobs")
      .withIndex("by_key")
      .collect();
    for (const key of requiredKeys) {
      if (!jobs.some((job) => job.key === key && job.status === "complete")) {
        throw new Error(`Required migration ${key} is incomplete`);
      }
    }
    for (const job of jobs) await ctx.db.delete(job._id);
    return { removed: jobs.length };
  },
});

/**
 * Mark releases created before phased publication as complete. The migration
 * is fenced by a run token, resumable after a stale lease, and processes a
 * bounded page per mutation so it is safe for production datasets.
 */
export const startReleasePublicationStatusBackfill = internalMutation({
  args: { forceRestart: v.optional(v.boolean()) },
  handler: async (ctx, { forceRestart = false }) => {
    const existing = await ctx.db
      .query("maintenanceJobs")
      .withIndex("by_key", (q) =>
        q.eq("key", RELEASE_PUBLICATION_STATUS_BACKFILL_KEY),
      )
      .unique();
    if (existing?.status === "complete" && !forceRestart) {
      return {
        started: false,
        complete: true,
        processed: existing.processed,
        updated: existing.updated ?? 0,
      };
    }
    const now = Date.now();
    if (
      existing?.status === "running" &&
      now - existing.updatedAt < BACKFILL_STALL_MS
    ) {
      return {
        started: false,
        complete: false,
        processed: existing.processed,
        updated: existing.updated ?? 0,
      };
    }
    const restart = existing?.status === "complete";
    const runToken = restart
      ? crypto.randomUUID()
      : (existing?.runToken ?? crypto.randomUUID());
    if (existing) {
      await ctx.db.patch(existing._id, {
        status: "running",
        runToken,
        cursor: restart ? undefined : existing.cursor,
        processed: restart ? 0 : existing.processed,
        updated: restart ? 0 : (existing.updated ?? 0),
        updatedAt: now,
        completedAt: undefined,
      });
    } else {
      await ctx.db.insert("maintenanceJobs", {
        key: RELEASE_PUBLICATION_STATUS_BACKFILL_KEY,
        status: "running",
        runToken,
        processed: 0,
        updated: 0,
        updatedAt: now,
      });
    }
    await ctx.scheduler.runAfter(
      0,
      internal.migrations.backfillReleasePublicationStatuses,
      {
        token: runToken,
        cursor: restart ? undefined : existing?.cursor,
      },
    );
    return {
      started: true,
      complete: false,
      processed: restart ? 0 : (existing?.processed ?? 0),
      updated: restart ? 0 : (existing?.updated ?? 0),
    };
  },
});

export const backfillReleasePublicationStatuses = internalMutation({
  args: {
    token: v.string(),
    cursor: v.optional(v.string()),
    batchSize: v.optional(v.number()),
  },
  handler: async (ctx, { token, cursor, batchSize = 50 }) => {
    const job = await ctx.db
      .query("maintenanceJobs")
      .withIndex("by_key", (q) =>
        q.eq("key", RELEASE_PUBLICATION_STATUS_BACKFILL_KEY),
      )
      .unique();
    if (
      job?.status !== "running" ||
      job.runToken !== token ||
      (job.cursor ?? null) !== (cursor ?? null)
    ) {
      return { applied: false, processed: 0, updated: 0, isDone: false };
    }
    const numItems = Math.max(1, Math.min(100, Math.floor(batchSize)));
    const page = await ctx.db.query("siteReleases").paginate({
      cursor: cursor ?? null,
      numItems,
    });
    let updated = 0;
    for (const release of page.page) {
      if (release.publicationStatus === undefined) {
        await ctx.db.patch(release._id, { publicationStatus: "complete" });
        updated += 1;
      }
    }
    const now = Date.now();
    const nextProcessed = job.processed + page.page.length;
    const nextUpdated = (job.updated ?? 0) + updated;
    if (page.isDone) {
      await ctx.db.patch(job._id, {
        status: "complete",
        cursor: undefined,
        processed: nextProcessed,
        updated: nextUpdated,
        updatedAt: now,
        completedAt: now,
      });
    } else {
      await ctx.db.patch(job._id, {
        cursor: page.continueCursor,
        processed: nextProcessed,
        updated: nextUpdated,
        updatedAt: now,
      });
      await ctx.scheduler.runAfter(
        0,
        internal.migrations.backfillReleasePublicationStatuses,
        {
          token,
          cursor: page.continueCursor,
          batchSize: numItems,
        },
      );
    }
    return {
      applied: true,
      processed: page.page.length,
      updated,
      isDone: page.isDone,
    };
  },
});

export const startDraftChangeRevisionBackfill = internalMutation({
  args: { forceRestart: v.optional(v.boolean()) },
  handler: async (ctx, { forceRestart = false }) => {
    const existing = await ctx.db
      .query("maintenanceJobs")
      .withIndex("by_key", (q) =>
        q.eq("key", DRAFT_CHANGE_REVISION_BACKFILL_KEY),
      )
      .unique();
    if (existing?.status === "complete" && !forceRestart) {
      return {
        started: false,
        complete: true,
        processed: existing.processed,
        updated: existing.updated ?? 0,
      };
    }
    const now = Date.now();
    if (
      existing?.status === "running" &&
      now - existing.updatedAt < BACKFILL_STALL_MS
    ) {
      return {
        started: false,
        complete: false,
        processed: existing.processed,
        updated: existing.updated ?? 0,
      };
    }
    const restart = existing?.status === "complete";
    const runToken = restart
      ? crypto.randomUUID()
      : (existing?.runToken ?? crypto.randomUUID());
    if (existing) {
      await ctx.db.patch(existing._id, {
        status: "running",
        runToken,
        cursor: restart ? undefined : existing.cursor,
        processed: restart ? 0 : existing.processed,
        updated: restart ? 0 : (existing.updated ?? 0),
        updatedAt: now,
        completedAt: undefined,
      });
    } else {
      await ctx.db.insert("maintenanceJobs", {
        key: DRAFT_CHANGE_REVISION_BACKFILL_KEY,
        status: "running",
        runToken,
        processed: 0,
        updated: 0,
        updatedAt: now,
      });
    }
    await ctx.scheduler.runAfter(
      0,
      internal.migrations.backfillDraftChangeRevisions,
      {
        token: runToken,
        cursor: restart ? undefined : existing?.cursor,
      },
    );
    return {
      started: true,
      complete: false,
      processed: restart ? 0 : (existing?.processed ?? 0),
      updated: restart ? 0 : (existing?.updated ?? 0),
    };
  },
});

export const backfillDraftChangeRevisions = internalMutation({
  args: {
    token: v.string(),
    cursor: v.optional(v.string()),
    batchSize: v.optional(v.number()),
  },
  handler: async (ctx, { token, cursor, batchSize = 50 }) => {
    const job = await ctx.db
      .query("maintenanceJobs")
      .withIndex("by_key", (q) =>
        q.eq("key", DRAFT_CHANGE_REVISION_BACKFILL_KEY),
      )
      .unique();
    if (
      job?.status !== "running" ||
      job.runToken !== token ||
      (job.cursor ?? null) !== (cursor ?? null)
    ) {
      return { applied: false, processed: 0, updated: 0, isDone: false };
    }
    const numItems = Math.max(1, Math.min(100, Math.floor(batchSize)));
    const page = await ctx.db.query("draftChanges").paginate({
      cursor: cursor ?? null,
      numItems,
    });
    let updated = 0;
    for (const change of page.page) {
      if (change.draftRevision !== undefined) continue;
      const site = await ctx.db.get(change.siteId);
      if (!site) continue;
      await ctx.db.patch(change._id, { draftRevision: site.draftRevision });
      updated += 1;
    }
    const now = Date.now();
    const nextProcessed = job.processed + page.page.length;
    const nextUpdated = (job.updated ?? 0) + updated;
    if (page.isDone) {
      await ctx.db.patch(job._id, {
        status: "complete",
        cursor: undefined,
        processed: nextProcessed,
        updated: nextUpdated,
        updatedAt: now,
        completedAt: now,
      });
    } else {
      await ctx.db.patch(job._id, {
        cursor: page.continueCursor,
        processed: nextProcessed,
        updated: nextUpdated,
        updatedAt: now,
      });
      await ctx.scheduler.runAfter(
        0,
        internal.migrations.backfillDraftChangeRevisions,
        {
          token,
          cursor: page.continueCursor,
          batchSize: numItems,
        },
      );
    }
    return {
      applied: true,
      processed: page.page.length,
      updated,
      isDone: page.isDone,
    };
  },
});

export const startReleaseChangeTimestampCleanup = internalMutation({
  args: { forceRestart: v.optional(v.boolean()) },
  handler: async (ctx, { forceRestart = false }) => {
    for (const status of ["building", "aborting", "clearing"] as const) {
      const active = await ctx.db
        .query("siteReleases")
        .withIndex("by_publication_status_updated", (q) =>
          q.eq("publicationStatus", status),
        )
        .first();
      if (active) {
        throw new Error(
          "Cannot clean legacy publication snapshots while a publication is active",
        );
      }
    }
    const revisionJob = await ctx.db
      .query("maintenanceJobs")
      .withIndex("by_key", (q) =>
        q.eq("key", DRAFT_CHANGE_REVISION_BACKFILL_KEY),
      )
      .unique();
    if (revisionJob?.status !== "complete") {
      throw new Error("Draft change revision backfill must complete first");
    }
    const existing = await ctx.db
      .query("maintenanceJobs")
      .withIndex("by_key", (q) =>
        q.eq("key", RELEASE_CHANGE_TIMESTAMP_CLEANUP_KEY),
      )
      .unique();
    if (existing?.status === "complete" && !forceRestart) {
      return {
        started: false,
        complete: true,
        processed: existing.processed,
        updated: existing.updated ?? 0,
      };
    }
    const now = Date.now();
    if (
      existing?.status === "running" &&
      now - existing.updatedAt < BACKFILL_STALL_MS
    ) {
      return {
        started: false,
        complete: false,
        processed: existing.processed,
        updated: existing.updated ?? 0,
      };
    }
    const restart = existing?.status === "complete";
    const runToken = restart
      ? crypto.randomUUID()
      : (existing?.runToken ?? crypto.randomUUID());
    if (existing) {
      await ctx.db.patch(existing._id, {
        status: "running",
        runToken,
        cursor: restart ? undefined : existing.cursor,
        processed: restart ? 0 : existing.processed,
        updated: restart ? 0 : (existing.updated ?? 0),
        updatedAt: now,
        completedAt: undefined,
      });
    } else {
      await ctx.db.insert("maintenanceJobs", {
        key: RELEASE_CHANGE_TIMESTAMP_CLEANUP_KEY,
        status: "running",
        runToken,
        processed: 0,
        updated: 0,
        updatedAt: now,
      });
    }
    await ctx.scheduler.runAfter(
      0,
      internal.migrations.cleanupReleaseChangeTimestamps,
      { token: runToken, cursor: restart ? undefined : existing?.cursor },
    );
    return {
      started: true,
      complete: false,
      processed: restart ? 0 : (existing?.processed ?? 0),
      updated: restart ? 0 : (existing?.updated ?? 0),
    };
  },
});

export const cleanupReleaseChangeTimestamps = internalMutation({
  args: {
    token: v.string(),
    cursor: v.optional(v.string()),
    batchSize: v.optional(v.number()),
  },
  handler: async (ctx, { token, cursor, batchSize = 50 }) => {
    const job = await ctx.db
      .query("maintenanceJobs")
      .withIndex("by_key", (q) =>
        q.eq("key", RELEASE_CHANGE_TIMESTAMP_CLEANUP_KEY),
      )
      .unique();
    if (
      job?.status !== "running" ||
      job.runToken !== token ||
      (job.cursor ?? null) !== (cursor ?? null)
    ) {
      return { applied: false, processed: 0, updated: 0, isDone: false };
    }
    const numItems = Math.max(1, Math.min(100, Math.floor(batchSize)));
    const page = await ctx.db.query("releaseChanges").paginate({
      cursor: cursor ?? null,
      numItems,
    });
    let updated = 0;
    for (const change of page.page) {
      if (change.sourceUpdatedAt === undefined) continue;
      await ctx.db.patch(change._id, { sourceUpdatedAt: undefined });
      updated += 1;
    }
    const now = Date.now();
    const nextProcessed = job.processed + page.page.length;
    const nextUpdated = (job.updated ?? 0) + updated;
    if (page.isDone) {
      await ctx.db.patch(job._id, {
        status: "complete",
        cursor: undefined,
        processed: nextProcessed,
        updated: nextUpdated,
        updatedAt: now,
        completedAt: now,
      });
    } else {
      await ctx.db.patch(job._id, {
        cursor: page.continueCursor,
        processed: nextProcessed,
        updated: nextUpdated,
        updatedAt: now,
      });
      await ctx.scheduler.runAfter(
        0,
        internal.migrations.cleanupReleaseChangeTimestamps,
        {
          token,
          cursor: page.continueCursor,
          batchSize: numItems,
        },
      );
    }
    return {
      applied: true,
      processed: page.page.length,
      updated,
      isDone: page.isDone,
    };
  },
});

/**
 * Canonicalize page slugs imported before page writes enforced the domain
 * invariant. This migration is idempotent and preserves uniqueness per site.
 */
export const normalizePageSlugs = internalMutation({
  args: {},
  handler: async (ctx) => {
    const pages = await ctx.db.query("pages").collect();
    const usedSlugsBySite = new Map<string, Set<string>>();

    for (const page of pages) {
      if (
        page.deletedAt !== undefined ||
        !canonicalPageSlugPattern.test(page.slug)
      ) {
        continue;
      }
      const used = usedSlugsBySite.get(page.siteId) ?? new Set<string>();
      used.add(page.slug);
      usedSlugsBySite.set(page.siteId, used);
    }

    const repairs: Array<{
      pageId: string;
      previousSlug: string;
      nextSlug: string;
    }> = [];
    const changedPageIdsBySite = new Map<Id<"sites">, Array<Id<"pages">>>();
    const invalidPages = pages
      .filter((page) => !canonicalPageSlugPattern.test(page.slug))
      .sort((a, b) => a._id.localeCompare(b._id));

    for (const page of invalidPages) {
      const used = usedSlugsBySite.get(page.siteId) ?? new Set<string>();
      const baseSlug =
        generateSlug(page.slug) || generateSlug(page.title) || "page";
      const nextSlug = uniqueSlugAmong(baseSlug, used);
      used.add(nextSlug);
      usedSlugsBySite.set(page.siteId, used);

      await ctx.db.patch(page._id, { slug: nextSlug, updatedAt: Date.now() });
      repairs.push({
        pageId: page._id,
        previousSlug: page.slug,
        nextSlug,
      });
      if (page.deletedAt === undefined) {
        const changedPageIds = changedPageIdsBySite.get(page.siteId) ?? [];
        changedPageIds.push(page._id);
        changedPageIdsBySite.set(page.siteId, changedPageIds);
      }
    }

    for (const [siteId, pageIds] of changedPageIdsBySite) {
      await touchSiteDraft(
        ctx,
        siteId,
        Date.now(),
        pageIds.map((pageId) => ({ entityType: "page", entityId: pageId })),
      );
    }

    return repairs;
  },
});

/**
 * Reindex every active sibling group to contiguous integer positions while
 * preserving its existing visual order. Imported data previously used
 * fractional positions, which the canonical page model no longer permits.
 */
export const normalizePageOrders = internalMutation({
  args: {},
  handler: async (ctx) => {
    const pages = await ctx.db.query("pages").collect();
    const siblingGroups = new Map<string, typeof pages>();

    for (const page of pages) {
      if (page.deletedAt !== undefined) continue;
      const groupKey = `${page.siteId}:${page.parentId ?? "root"}`;
      const siblings = siblingGroups.get(groupKey) ?? [];
      siblings.push(page);
      siblingGroups.set(groupKey, siblings);
    }

    const repairs: Array<{
      pageId: string;
      previousOrder: number;
      nextOrder: number;
    }> = [];
    const changedPageIdsBySite = new Map<Id<"sites">, Array<Id<"pages">>>();

    for (const siblings of siblingGroups.values()) {
      siblings.sort((a, b) => a.order - b.order || a._id.localeCompare(b._id));
      for (const [nextOrder, page] of siblings.entries()) {
        if (page.order === nextOrder) continue;
        await ctx.db.patch(page._id, {
          order: nextOrder,
          updatedAt: Date.now(),
        });
        repairs.push({
          pageId: page._id,
          previousOrder: page.order,
          nextOrder,
        });
        const changedPageIds = changedPageIdsBySite.get(page.siteId) ?? [];
        changedPageIds.push(page._id);
        changedPageIdsBySite.set(page.siteId, changedPageIds);
      }
    }

    for (const [siteId, pageIds] of changedPageIdsBySite) {
      await touchSiteDraft(
        ctx,
        siteId,
        Date.now(),
        pageIds.map((pageId) => ({ entityType: "page", entityId: pageId })),
      );
    }

    return repairs;
  },
});

/**
 * Queue extraction for files created before file extraction state existed.
 * Pages are bounded and self-scheduled; rerunning is safe because queueing is
 * keyed by file and its immutable storage source version.
 */
export const startFileExtractionBackfill = internalMutation({
  args: { forceRestart: v.optional(v.boolean()) },
  handler: async (ctx, { forceRestart = false }) => {
    const existing = await ctx.db
      .query("maintenanceJobs")
      .withIndex("by_key", (q) => q.eq("key", FILE_EXTRACTION_BACKFILL_KEY))
      .unique();
    if (existing?.status === "complete" && !forceRestart) {
      return { started: false, complete: true };
    }
    const now = Date.now();
    if (
      existing?.status === "running" &&
      now - existing.updatedAt < BACKFILL_STALL_MS
    ) {
      return { started: false, complete: false };
    }
    const runToken =
      existing?.status === "complete"
        ? crypto.randomUUID()
        : (existing?.runToken ?? crypto.randomUUID());
    if (existing) {
      await ctx.db.patch(existing._id, {
        status: "running",
        runToken,
        cursor: existing.status === "complete" ? undefined : existing.cursor,
        processed: existing.status === "complete" ? 0 : existing.processed,
        updatedAt: now,
        completedAt: undefined,
      });
    } else {
      await ctx.db.insert("maintenanceJobs", {
        key: FILE_EXTRACTION_BACKFILL_KEY,
        status: "running",
        runToken,
        processed: 0,
        updatedAt: now,
      });
    }
    await ctx.scheduler.runAfter(
      0,
      internal.migrations.backfillFileExtractions,
      {
        token: runToken,
        cursor: existing?.status === "complete" ? undefined : existing?.cursor,
      },
    );
    return { started: true, complete: false };
  },
});

export const backfillFileExtractions = internalMutation({
  args: {
    token: v.string(),
    cursor: v.optional(v.string()),
    batchSize: v.optional(v.number()),
  },
  handler: async (ctx, { token, cursor, batchSize = 50 }) => {
    const job = await ctx.db
      .query("maintenanceJobs")
      .withIndex("by_key", (q) => q.eq("key", FILE_EXTRACTION_BACKFILL_KEY))
      .unique();
    if (
      job?.status !== "running" ||
      job.runToken !== token ||
      (job.cursor ?? null) !== (cursor ?? null)
    ) {
      return {
        applied: false,
        processed: 0,
        queued: 0,
        skipped: 0,
        isDone: false,
        continueCursor: null,
      };
    }
    const numItems = Math.max(1, Math.min(100, Math.floor(batchSize)));
    const page = await ctx.db.query("files").paginate({
      cursor: cursor ?? null,
      numItems,
    });
    let queued = 0;
    let skipped = 0;
    for (const file of page.page) {
      if (file.kind !== "file" || file.deletedAt !== undefined) {
        skipped += 1;
        continue;
      }
      const jobId = await queueFileExtraction(ctx, file, {
        deferDispatch: true,
      });
      if (jobId) queued += 1;
      else skipped += 1;
    }
    if (queued > 0) {
      await ctx.scheduler.runAfter(
        0,
        internal.fileExtraction.dispatchQueued,
        {},
      );
    }
    if (!page.isDone) {
      await ctx.db.patch(job._id, {
        cursor: page.continueCursor,
        processed: job.processed + page.page.length,
        updatedAt: Date.now(),
      });
      await ctx.scheduler.runAfter(
        0,
        internal.migrations.backfillFileExtractions,
        {
          token,
          cursor: page.continueCursor,
          batchSize: numItems,
        },
      );
    } else {
      const now = Date.now();
      await ctx.db.patch(job._id, {
        status: "complete",
        cursor: undefined,
        processed: job.processed + page.page.length,
        updatedAt: now,
        completedAt: now,
      });
    }
    return {
      applied: true,
      processed: page.page.length,
      queued,
      skipped,
      isDone: page.isDone,
      continueCursor: page.isDone ? null : page.continueCursor,
    };
  },
});
