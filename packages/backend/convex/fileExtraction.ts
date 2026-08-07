import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import {
  type MutationCtx,
  internalMutation,
  mutation,
  query,
} from "./_generated/server";
import {
  buildFileSearchContent,
  extractionDispatchCapacity,
  extractionExecutionDeadline,
  extractionRetryDelayMs,
  FILE_EXTRACTION_LIMITS,
  fileSourceVersion,
  type FileExtractionFailure,
  shouldReuseExtraction,
  validateExtractionInputSize,
} from "./model/fileExtraction";
import { assertDraftReadable, touchSiteDraft } from "./model/draft";
import { extractionRetryInvalidatesDraft } from "./model/releaseState";
import {
  requireOrganizationMember,
  requireOrganizationPermission,
} from "./permissions";

const failureValidator = v.object({
  code: v.string(),
  message: v.string(),
  retryable: v.boolean(),
  limit: v.optional(v.number()),
  actual: v.optional(v.number()),
});

function fileMetadata(file: Doc<"files">) {
  return {
    fileId: file._id,
    filename: file.filename,
    fileContentType: file.contentType,
    size: file.size,
    libraryId: file.libraryId,
    downloadUrl: `/api/files/${file._id}`,
  };
}

async function upsertSearchEntries(
  ctx: MutationCtx,
  file: Doc<"files">,
  extractedText: string,
) {
  const now = Date.now();
  const text = buildFileSearchContent(extractedText);
  const existing = await ctx.db
    .query("searchEntries")
    .withIndex("by_source", (q) =>
      q.eq("kind", "file").eq("sourceId", file._id),
    )
    .first();
  const value = {
    siteId: file.siteId,
    kind: "file" as const,
    audience: "private" as const,
    sourceId: file._id,
    title: file.filename,
    text,
    fileMetadata: fileMetadata(file),
    updatedAt: now,
  };
  if (existing) await ctx.db.patch(existing._id, value);
  else await ctx.db.insert("searchEntries", value);
}

async function resetCurrentSearchEntry(ctx: MutationCtx, file: Doc<"files">) {
  const entry = await ctx.db
    .query("searchEntries")
    .withIndex("by_source", (q) =>
      q.eq("kind", "file").eq("sourceId", file._id),
    )
    .first();
  const value = {
    siteId: file.siteId,
    kind: "file" as const,
    audience: "private" as const,
    sourceId: file._id,
    title: file.filename,
    text: "",
    fileMetadata: fileMetadata(file),
    updatedAt: Date.now(),
  };
  if (entry) await ctx.db.patch(entry._id, value);
  else await ctx.db.insert("searchEntries", value);
}

export async function reconcileRestoredFile(
  ctx: MutationCtx,
  file: Doc<"files">,
) {
  if (file.kind !== "file" || file.deletedAt !== undefined) return;
  const extraction = await ctx.db
    .query("fileExtractions")
    .withIndex("by_file", (q) => q.eq("fileId", file._id))
    .first();
  if (
    extraction?.status === "ready" &&
    extraction.sourceVersion === fileSourceVersion(file) &&
    extraction.extractedText !== undefined
  ) {
    await upsertSearchEntries(ctx, file, extraction.extractedText);
  } else {
    await resetCurrentSearchEntry(ctx, file);
  }
  await queueFileExtraction(ctx, file);
}

async function scheduleDispatch(ctx: MutationCtx, delay = 0) {
  await ctx.scheduler.runAfter(
    delay,
    internal.fileExtraction.dispatchQueued,
    {},
  );
}

export async function queueFileExtraction(
  ctx: MutationCtx,
  file: Doc<"files">,
  options: { force?: boolean; deferDispatch?: boolean } = {},
): Promise<Id<"fileExtractionJobs"> | null> {
  if (file.kind !== "file" || file.deletedAt !== undefined) return null;
  const sourceVersion = fileSourceVersion(file);
  const now = Date.now();
  const [existingState, existingJob] = await Promise.all([
    ctx.db
      .query("fileExtractions")
      .withIndex("by_file", (q) => q.eq("fileId", file._id))
      .first(),
    ctx.db
      .query("fileExtractionJobs")
      .withIndex("by_file", (q) => q.eq("fileId", file._id))
      .first(),
  ]);

  if (
    shouldReuseExtraction({
      force: options.force === true,
      sourceVersion,
      existingSourceVersion: existingState?.sourceVersion,
      existingStatus: existingState?.status,
      hasJob: Boolean(existingJob),
    })
  ) {
    if (existingJob?.status === "queued" && !options.deferDispatch) {
      await scheduleDispatch(ctx);
    }
    return existingJob?._id ?? null;
  }

  await resetCurrentSearchEntry(ctx, file);

  const extractionValue = {
    siteId: file.siteId,
    fileId: file._id,
    sourceVersion,
    status: "queued" as const,
    attemptCount: 0,
    createdAt: existingState?.createdAt ?? now,
    updatedAt: now,
  };
  let extractionId: Id<"fileExtractions">;
  if (existingState) {
    await ctx.db.replace(existingState._id, extractionValue);
    extractionId = existingState._id;
  } else {
    extractionId = await ctx.db.insert("fileExtractions", extractionValue);
  }

  const jobValue = {
    siteId: file.siteId,
    fileId: file._id,
    extractionId,
    sourceVersion,
    status: "queued" as const,
    attempt: 0,
    availableAt: now,
    createdAt: existingJob?.createdAt ?? now,
    updatedAt: now,
  };
  let jobId: Id<"fileExtractionJobs">;
  if (existingJob) {
    await ctx.db.replace(existingJob._id, jobValue);
    jobId = existingJob._id;
  } else {
    jobId = await ctx.db.insert("fileExtractionJobs", jobValue);
  }
  if (!options.deferDispatch) await scheduleDispatch(ctx);
  return jobId;
}

export async function cancelFileExtraction(
  ctx: MutationCtx,
  fileId: Id<"files">,
) {
  const [state, job] = await Promise.all([
    ctx.db
      .query("fileExtractions")
      .withIndex("by_file", (q) => q.eq("fileId", fileId))
      .first(),
    ctx.db
      .query("fileExtractionJobs")
      .withIndex("by_file", (q) => q.eq("fileId", fileId))
      .first(),
  ]);
  if (state) await ctx.db.delete(state._id);
  if (job?.status === "queued") await ctx.db.delete(job._id);
}

export const dispatchQueued = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const processing = await ctx.db
      .query("fileExtractionJobs")
      .withIndex("by_status_lease", (q) => q.eq("status", "processing"))
      .take(FILE_EXTRACTION_LIMITS.maxConcurrent);
    const capacity = extractionDispatchCapacity(processing.length);
    if (capacity === 0) return { dispatched: 0, discarded: 0 };

    const candidates = await ctx.db
      .query("fileExtractionJobs")
      .withIndex("by_status_available", (q) =>
        q.eq("status", "queued").lte("availableAt", now),
      )
      .take(FILE_EXTRACTION_LIMITS.dispatchScanSize);
    let dispatched = 0;
    let discarded = 0;
    for (const job of candidates) {
      if (dispatched >= capacity) break;
      const [file, extraction] = await Promise.all([
        ctx.db.get(job.fileId),
        ctx.db.get(job.extractionId),
      ]);
      if (
        file?.kind !== "file" ||
        file.deletedAt !== undefined ||
        !extraction ||
        extraction.sourceVersion !== job.sourceVersion ||
        fileSourceVersion(file) !== job.sourceVersion
      ) {
        await ctx.db.delete(job._id);
        discarded += 1;
        continue;
      }

      const declaredSizeFailure = validateExtractionInputSize(file.size);
      if (declaredSizeFailure) {
        await ctx.db.patch(extraction._id, {
          status: "failed",
          failure: declaredSizeFailure,
          updatedAt: now,
          completedAt: now,
        });
        await resetCurrentSearchEntry(ctx, file);
        await ctx.db.delete(job._id);
        discarded += 1;
        continue;
      }

      const attempt = job.attempt + 1;
      if (attempt > FILE_EXTRACTION_LIMITS.maxAttempts) {
        const failure: FileExtractionFailure = {
          code: "attempts_exhausted",
          message: "Extraction retry limit was exhausted",
          retryable: false,
        };
        await ctx.db.patch(extraction._id, {
          status: "failed",
          failure,
          updatedAt: now,
          completedAt: now,
        });
        await resetCurrentSearchEntry(ctx, file);
        await ctx.db.delete(job._id);
        discarded += 1;
        continue;
      }

      const runToken = crypto.randomUUID();
      await ctx.db.patch(job._id, {
        status: "processing",
        attempt,
        runToken,
        leaseExpiresAt: now + FILE_EXTRACTION_LIMITS.leaseMs,
        updatedAt: now,
      });
      await ctx.db.patch(extraction._id, {
        status: "processing",
        attemptCount: attempt,
        failure: undefined,
        updatedAt: now,
      });
      await ctx.scheduler.runAfter(0, internal.fileExtractionAction.process, {
        jobId: job._id,
        runToken,
      });
      dispatched += 1;
    }

    if (
      dispatched < capacity &&
      candidates.length === FILE_EXTRACTION_LIMITS.dispatchScanSize
    ) {
      await scheduleDispatch(ctx);
    }
    return { dispatched, discarded };
  },
});

export const getClaimed = internalMutation({
  args: {
    jobId: v.id("fileExtractionJobs"),
    runToken: v.string(),
  },
  handler: async (ctx, { jobId, runToken }) => {
    const job = await ctx.db.get(jobId);
    if (job?.status !== "processing" || job.runToken !== runToken) return null;
    const [file, extraction] = await Promise.all([
      ctx.db.get(job.fileId),
      ctx.db.get(job.extractionId),
    ]);
    if (
      file?.kind !== "file" ||
      file.deletedAt !== undefined ||
      !extraction ||
      extraction.sourceVersion !== job.sourceVersion ||
      fileSourceVersion(file) !== job.sourceVersion
    ) {
      await ctx.db.delete(job._id);
      await scheduleDispatch(ctx);
      return null;
    }
    return {
      jobId: job._id,
      runToken,
      fileId: file._id,
      objectKey: file.objectKey,
      filename: file.filename,
      contentType: file.contentType,
      size: file.size,
      checksum: file.checksum,
      attempt: job.attempt,
      deadlineAt: extractionExecutionDeadline(job.updatedAt),
    };
  },
});

export const renewLease = internalMutation({
  args: {
    jobId: v.id("fileExtractionJobs"),
    runToken: v.string(),
  },
  handler: async (ctx, { jobId, runToken }) => {
    const job = await ctx.db.get(jobId);
    if (job?.status !== "processing" || job.runToken !== runToken) return null;
    const now = Date.now();
    await ctx.db.patch(job._id, {
      leaseExpiresAt: now + FILE_EXTRACTION_LIMITS.leaseMs,
      updatedAt: now,
    });
    return { deadlineAt: extractionExecutionDeadline(now) };
  },
});

export const complete = internalMutation({
  args: {
    jobId: v.id("fileExtractionJobs"),
    runToken: v.string(),
    text: v.string(),
    format: v.string(),
    inputBytes: v.number(),
  },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (job?.status !== "processing" || job.runToken !== args.runToken) {
      return { applied: false };
    }
    const [file, extraction] = await Promise.all([
      ctx.db.get(job.fileId),
      ctx.db.get(job.extractionId),
    ]);
    if (
      file?.kind !== "file" ||
      file.deletedAt !== undefined ||
      !extraction ||
      extraction.sourceVersion !== job.sourceVersion ||
      fileSourceVersion(file) !== job.sourceVersion
    ) {
      await ctx.db.delete(job._id);
      await scheduleDispatch(ctx);
      return { applied: false };
    }
    const now = Date.now();
    await ctx.db.patch(extraction._id, {
      status: "ready",
      extractedText: args.text,
      format: args.format,
      inputBytes: args.inputBytes,
      outputChars: args.text.length,
      failure: undefined,
      updatedAt: now,
      completedAt: now,
    });
    await upsertSearchEntries(ctx, file, args.text);
    await ctx.db.delete(job._id);
    await scheduleDispatch(ctx);
    return { applied: true };
  },
});

export const fail = internalMutation({
  args: {
    jobId: v.id("fileExtractionJobs"),
    runToken: v.string(),
    failure: failureValidator,
  },
  handler: async (ctx, { jobId, runToken, failure }) => {
    const job = await ctx.db.get(jobId);
    if (job?.status !== "processing" || job.runToken !== runToken) {
      return { applied: false, retrying: false };
    }
    const extraction = await ctx.db.get(job.extractionId);
    if (!extraction || extraction.sourceVersion !== job.sourceVersion) {
      await ctx.db.delete(job._id);
      await scheduleDispatch(ctx);
      return { applied: false, retrying: false };
    }
    const now = Date.now();
    const retrying =
      failure.retryable && job.attempt < FILE_EXTRACTION_LIMITS.maxAttempts;
    if (retrying) {
      const delay = extractionRetryDelayMs(job.attempt);
      await ctx.db.patch(job._id, {
        status: "queued",
        runToken: undefined,
        leaseExpiresAt: undefined,
        availableAt: now + delay,
        updatedAt: now,
      });
      await ctx.db.patch(extraction._id, {
        status: "queued",
        failure,
        updatedAt: now,
      });
      await scheduleDispatch(ctx);
      await scheduleDispatch(ctx, delay);
    } else {
      await ctx.db.patch(extraction._id, {
        status: "failed",
        failure,
        updatedAt: now,
        completedAt: now,
      });
      const file = await ctx.db.get(job.fileId);
      if (file?.kind === "file" && file.deletedAt === undefined) {
        await resetCurrentSearchEntry(ctx, file);
      }
      await ctx.db.delete(job._id);
      await scheduleDispatch(ctx);
    }
    return { applied: true, retrying };
  },
});

export const recoverStalled = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const jobs = await ctx.db
      .query("fileExtractionJobs")
      .withIndex("by_status_lease", (q) =>
        q.eq("status", "processing").lt("leaseExpiresAt", now),
      )
      .take(50);
    for (const job of jobs) {
      const failure: FileExtractionFailure = {
        code: "lease_expired",
        message: "Extraction worker did not finish before its lease expired",
        retryable: true,
      };
      const [extraction, file] = await Promise.all([
        ctx.db.get(job.extractionId),
        ctx.db.get(job.fileId),
      ]);
      if (!extraction) {
        await ctx.db.delete(job._id);
        continue;
      }
      if (job.attempt >= FILE_EXTRACTION_LIMITS.maxAttempts) {
        await ctx.db.patch(extraction._id, {
          status: "failed",
          failure,
          updatedAt: now,
          completedAt: now,
        });
        if (file?.kind === "file" && file.deletedAt === undefined) {
          await resetCurrentSearchEntry(ctx, file);
        }
        await ctx.db.delete(job._id);
        continue;
      }
      await ctx.db.patch(job._id, {
        status: "queued",
        runToken: undefined,
        leaseExpiresAt: undefined,
        availableAt: now,
        updatedAt: now,
      });
      await ctx.db.patch(extraction._id, {
        status: "queued",
        failure,
        updatedAt: now,
      });
    }
    await scheduleDispatch(ctx);
    return { recovered: jobs.length };
  },
});

export const getStatus = query({
  args: { fileId: v.id("files") },
  handler: async (ctx, { fileId }) => {
    const file = await ctx.db.get(fileId);
    if (file?.kind !== "file") return null;
    const site = await ctx.db.get(file.siteId);
    if (!site) return null;
    await requireOrganizationMember(ctx, site.organizationId);
    assertDraftReadable(site);
    if (file.deletedAt !== undefined) return null;
    const extraction = await ctx.db
      .query("fileExtractions")
      .withIndex("by_file", (q) => q.eq("fileId", fileId))
      .first();
    if (!extraction) return null;
    return {
      status: extraction.status,
      attemptCount: extraction.attemptCount,
      failure: extraction.failure,
      updatedAt: extraction.updatedAt,
      completedAt: extraction.completedAt,
      limits: FILE_EXTRACTION_LIMITS,
    };
  },
});

export const retry = mutation({
  args: { fileId: v.id("files") },
  handler: async (ctx, { fileId }) => {
    const file = await ctx.db.get(fileId);
    if (file?.kind !== "file" || file.deletedAt !== undefined) {
      throw new ConvexError("File not found");
    }
    const site = await ctx.db.get(file.siteId);
    if (!site) throw new ConvexError("Site not found");
    await requireOrganizationPermission(ctx, site.organizationId, {
      resource: "library",
      action: "manage",
    });
    const previous = await ctx.db
      .query("fileExtractions")
      .withIndex("by_file", (q) => q.eq("fileId", fileId))
      .first();
    const jobId = await queueFileExtraction(ctx, file, { force: true });
    if (jobId && extractionRetryInvalidatesDraft(previous?.status)) {
      await touchSiteDraft(ctx, file.siteId, Date.now(), [
        { entityType: "file", entityId: file._id },
      ]);
    }
    return { queued: jobId !== null, jobId };
  },
});
