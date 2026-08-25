import type { WorkId } from "@convex-dev/workpool";
import { vOnCompleteArgs } from "@convex-dev/workpool";
import { ConvexError, v } from "convex/values";
import { components, internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import {
  internalMutation,
  type MutationCtx,
  mutation,
  query,
  type QueryCtx,
} from "./_generated/server";
import {
  ConvexIngestionQueue,
  decodeConvexIngestionFailure,
  type ConvexIngestionJob,
  type ConvexIngestionReceipt,
  type DurableIngestionBinding,
} from "./fileExtractionQueue";
import { assertDraftReadable, touchSiteDraft } from "./model/draft";
import {
  FILE_EXTRACTION_LIMITS,
  fileSourceVersion,
} from "./model/fileExtraction";
import { extractionRetryInvalidatesDraft } from "./model/releaseState";
import {
  requireOrganizationMember,
  requireOrganizationPermission,
} from "./permissions";
import { upsertDraftFileSearch } from "./search";

const jobIdentity = {
  entityId: v.string(),
  sourceVersion: v.string(),
  generation: v.number(),
  idempotencyKey: v.string(),
  source: v.object({ fileId: v.id("files") }),
};

export type FileIngestionJob = ConvexIngestionJob<{
  fileId: Id<"files">;
}>;

export type FileIngestionResult = {
  byteLength: number;
  format: string;
  output?: unknown;
  sha256?: string;
  status: "applied" | "superseded";
};

function receiptFor(
  extraction: Doc<"fileExtractions">,
): ConvexIngestionReceipt | null {
  if (!extraction.workId) return null;
  return {
    entityId: extraction.fileId,
    sourceVersion: extraction.sourceVersion,
    generation: extraction.generation,
    idempotencyKey: extraction.idempotencyKey,
    workId: extraction.workId as WorkId,
  };
}

function identityMatches(
  extraction: Doc<"fileExtractions"> | null,
  identity: {
    entityId: string;
    sourceVersion: string;
    generation: number;
    idempotencyKey: string;
  },
) {
  return (
    extraction !== null &&
    extraction.fileId === identity.entityId &&
    extraction.sourceVersion === identity.sourceVersion &&
    extraction.generation === identity.generation &&
    extraction.idempotencyKey === identity.idempotencyKey
  );
}

export const fileIngestionBinding: DurableIngestionBinding<
  FileIngestionJob,
  MutationCtx,
  QueryCtx
> = {
  bind: async (ctx, job, candidate) => {
    const extraction = await ctx.db
      .query("fileExtractions")
      .withIndex("by_file", (q) => q.eq("fileId", job.source.fileId))
      .unique();
    if (!extraction || !identityMatches(extraction, job)) {
      throw new Error("The AnyDoc ingestion generation is no longer current");
    }
    if (extraction.workId) return extraction.workId as WorkId;
    await ctx.db.patch(extraction._id, { workId: candidate });
    return candidate;
  },
  cancel: async (ctx, receipt) => {
    const fileId = receipt.entityId as Id<"files">;
    const extraction = await ctx.db
      .query("fileExtractions")
      .withIndex("by_file", (q) => q.eq("fileId", fileId))
      .unique();
    if (
      !extraction ||
      !identityMatches(extraction, receipt) ||
      extraction.workId !== receipt.workId
    ) {
      return false;
    }
    await ctx.db.patch(extraction._id, {
      generation: extraction.generation + 1,
      status: "failed",
      workId: undefined,
      updatedAt: Date.now(),
    });
    return true;
  },
  status: async (ctx, receipt) => {
    const fileId = receipt.entityId as Id<"files">;
    const extraction = await ctx.db
      .query("fileExtractions")
      .withIndex("by_file", (q) => q.eq("fileId", fileId))
      .unique();
    return {
      current:
        identityMatches(extraction, receipt) &&
        extraction?.workId === receipt.workId,
      status: extraction?.status,
    };
  },
};

export const fileIngestion: ConvexIngestionQueue<
  FileIngestionJob,
  FileIngestionResult,
  MutationCtx,
  QueryCtx
> = new ConvexIngestionQueue(
  components.anydoc,
  internal.fileExtractionAction.process,
  {
    binding: fileIngestionBinding,
    completionContext: (job) => ({
      entityId: job.entityId,
      sourceVersion: job.sourceVersion,
      generation: job.generation,
      idempotencyKey: job.idempotencyKey,
      source: job.source,
    }),
    maxParallelism: 4,
    onComplete: internal.fileExtraction.completed,
    retry: { base: 2, initialBackoffMs: 1_000, maxAttempts: 4 },
  },
);

async function resetCurrentSearchEntry(ctx: MutationCtx, file: Doc<"files">) {
  await upsertDraftFileSearch(ctx, file, "");
}

function createJob(file: Doc<"files">, generation: number): FileIngestionJob {
  const sourceVersion = fileSourceVersion(file);
  return {
    entityId: file._id,
    sourceVersion,
    generation,
    idempotencyKey: `${file._id}:${generation}:${sourceVersion}`,
    source: { fileId: file._id },
    filename: file.filename,
    contentType: file.contentType,
    expectedSize: file.size,
    expectedSha256:
      file.checksum && /^[a-f\d]{64}$/iu.test(file.checksum)
        ? file.checksum.toLowerCase()
        : undefined,
    maxBytes: FILE_EXTRACTION_LIMITS.maxInputBytes,
    attemptTimeoutMs: 8 * 60_000,
  };
}

export async function queueFileExtraction(
  ctx: MutationCtx,
  file: Doc<"files">,
  options: { force?: boolean } = {},
): Promise<WorkId | null> {
  if (file.kind !== "file" || file.deletedAt !== undefined) return null;
  const sourceVersion = fileSourceVersion(file);
  const existing = await ctx.db
    .query("fileExtractions")
    .withIndex("by_file", (q) => q.eq("fileId", file._id))
    .unique();
  const reusable =
    !options.force &&
    existing?.sourceVersion === sourceVersion &&
    (existing.status === "ready" || Boolean(existing.workId));
  if (reusable) return (existing.workId as WorkId | undefined) ?? null;

  const previousReceipt = existing ? receiptFor(existing) : null;
  if (previousReceipt) await fileIngestion.cancel(ctx, previousReceipt);
  const generation = existing ? existing.generation + 1 : 0;
  const job = createJob(file, generation);
  const now = Date.now();
  const value = {
    siteId: file.siteId,
    fileId: file._id,
    sourceVersion,
    generation,
    idempotencyKey: job.idempotencyKey,
    status: "queued" as const,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  if (existing) await ctx.db.replace(existing._id, value);
  else await ctx.db.insert("fileExtractions", value);
  await resetCurrentSearchEntry(ctx, file);

  return (await fileIngestion.enqueue(ctx, job)).workId;
}

export async function cancelFileExtraction(
  ctx: MutationCtx,
  fileId: Id<"files">,
) {
  const extraction = await ctx.db
    .query("fileExtractions")
    .withIndex("by_file", (q) => q.eq("fileId", fileId))
    .unique();
  if (!extraction) return;
  const receipt = receiptFor(extraction);
  if (receipt) {
    try {
      await fileIngestion.cancel(ctx, receipt);
    } catch {
      // Deletion remains authoritative even if the queue provider cannot cancel
      // a job that has already started. The missing extraction row fences all
      // later result writes for this file.
    }
  }
  await ctx.db.delete(extraction._id);
}

export async function reconcileRestoredFile(
  ctx: MutationCtx,
  file: Doc<"files">,
) {
  if (file.kind !== "file" || file.deletedAt !== undefined) return;
  const extraction = await ctx.db
    .query("fileExtractions")
    .withIndex("by_file", (q) => q.eq("fileId", file._id))
    .unique();
  if (
    extraction?.status === "ready" &&
    extraction.sourceVersion === fileSourceVersion(file) &&
    extraction.extractedText !== undefined
  ) {
    await upsertDraftFileSearch(ctx, file, extraction.extractedText);
    return;
  }
  await queueFileExtraction(ctx, file);
}

export const markProcessing = internalMutation({
  args: jobIdentity,
  handler: async (ctx, args) => {
    const extraction = await ctx.db
      .query("fileExtractions")
      .withIndex("by_file", (q) => q.eq("fileId", args.source.fileId))
      .unique();
    const file = await ctx.db.get(args.source.fileId);
    if (
      !extraction ||
      !identityMatches(extraction, args) ||
      file?.kind !== "file" ||
      file.deletedAt !== undefined ||
      fileSourceVersion(file) !== args.sourceVersion
    ) {
      return null;
    }
    await ctx.db.patch(extraction._id, {
      status: "processing",
      failure: undefined,
      updatedAt: Date.now(),
    });
    return {
      objectKey: file.objectKey,
      filename: file.filename,
      contentType: file.contentType,
      size: file.size,
      checksum: file.checksum,
    };
  },
});

export const storeResult = internalMutation({
  args: {
    ...jobIdentity,
    text: v.string(),
    format: v.string(),
    inputBytes: v.number(),
  },
  handler: async (ctx, args) => {
    const extraction = await ctx.db
      .query("fileExtractions")
      .withIndex("by_file", (q) => q.eq("fileId", args.source.fileId))
      .unique();
    const file = await ctx.db.get(args.source.fileId);
    if (
      !extraction ||
      !identityMatches(extraction, args) ||
      file?.kind !== "file" ||
      file.deletedAt !== undefined ||
      fileSourceVersion(file) !== args.sourceVersion
    ) {
      return { status: "superseded" as const };
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
    await upsertDraftFileSearch(ctx, file, args.text);
    return { status: "applied" as const };
  },
});

export const completed = internalMutation({
  args: vOnCompleteArgs(v.object(jobIdentity)),
  handler: async (ctx, { workId, context, result }) => {
    const extraction = await ctx.db
      .query("fileExtractions")
      .withIndex("by_file", (q) => q.eq("fileId", context.source.fileId))
      .unique();
    if (
      !extraction ||
      !identityMatches(extraction, context) ||
      extraction.workId !== workId
    ) {
      return;
    }
    if (result.kind === "success") {
      await ctx.db.patch(extraction._id, { workId: undefined });
      return;
    }
    const decoded = decodeConvexIngestionFailure(result);
    const now = Date.now();
    await ctx.db.patch(extraction._id, {
      status: "failed",
      workId: undefined,
      failure: {
        code:
          result.kind === "canceled"
            ? "cancelled"
            : (decoded?.code ?? "ingestion_failed"),
        message:
          result.kind === "canceled"
            ? "Document ingestion was cancelled"
            : (decoded?.message ?? result.error),
        retryable: decoded?.retryable ?? false,
        limits: decoded?.limits,
      },
      updatedAt: now,
      completedAt: now,
    });
    const file = await ctx.db.get(context.source.fileId);
    if (file?.kind === "file" && file.deletedAt === undefined) {
      await resetCurrentSearchEntry(ctx, file);
    }
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
      .unique();
    if (!extraction) return null;
    const receipt = receiptFor(extraction);
    const durable = receipt
      ? await fileIngestion.status(ctx, receipt)
      : undefined;
    return {
      status: extraction.status,
      attemptCount:
        durable?.workpool.state === "pending" ||
        durable?.workpool.state === "running"
          ? durable.workpool.previousAttempts
          : undefined,
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
      .unique();
    const workId = await queueFileExtraction(ctx, file, { force: true });
    if (workId && extractionRetryInvalidatesDraft(previous?.status)) {
      await touchSiteDraft(ctx, file.siteId, Date.now(), [
        { entityType: "file", entityId: file._id },
      ]);
    }
    return { queued: workId !== null, workId };
  },
});
