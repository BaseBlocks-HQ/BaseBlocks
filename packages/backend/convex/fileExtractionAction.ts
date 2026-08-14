"use node";

import {
  createConvexIngestionHandler,
  iterableSource,
} from "@baseblocks/anydoc-convex/node";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalAction, type ActionCtx } from "./_generated/server";
import type { FileIngestionJob, FileIngestionResult } from "./fileExtraction";
import {
  FILE_EXTRACTION_LIMITS,
  validateStoredSourceMetadata,
} from "./model/fileExtraction";
import { getStorage } from "./storage";

const jobArgs = {
  entityId: v.string(),
  sourceVersion: v.string(),
  generation: v.number(),
  idempotencyKey: v.string(),
  source: v.object({ fileId: v.id("files") }),
  metadata: v.optional(v.any()),
  format: v.optional(v.string()),
  filename: v.optional(v.string()),
  contentType: v.optional(v.string()),
  expectedSize: v.optional(v.number()),
  expectedSha256: v.optional(v.string()),
  maxBytes: v.optional(v.number()),
  attemptTimeoutMs: v.optional(v.number()),
};

function jobIdentity(job: FileIngestionJob) {
  return {
    entityId: job.entityId,
    generation: job.generation,
    idempotencyKey: job.idempotencyKey,
    source: job.source,
    sourceVersion: job.sourceVersion,
  };
}

const ingestionHandler = createConvexIngestionHandler<
  ActionCtx,
  FileIngestionJob
>({
  ingestion: { maxTextBytes: FILE_EXTRACTION_LIMITS.maxOutputBytes },
  resolveSource: async (ctx, job, attempt) => {
    const source = await ctx.runMutation(
      internal.fileExtraction.markProcessing,
      jobIdentity(job),
    );
    if (!source) {
      throw Object.assign(new Error("The file source changed"), {
        code: "source-changed",
        retryable: false,
      });
    }
    const storage = getStorage();
    const metadata = await storage.head(source.objectKey, {
      retries: FILE_EXTRACTION_LIMITS.storageRetries,
      signal: attempt.signal,
      timeout: FILE_EXTRACTION_LIMITS.storageTimeoutMs,
    });
    const failure = validateStoredSourceMetadata(source, metadata);
    if (failure) {
      throw Object.assign(new Error(failure.message), {
        ...failure,
        code: "source-changed",
        retryable: false,
      });
    }
    return iterableSource(
      async ({ signal }) => {
        const stored = await storage.download(source.objectKey, {
          as: "stream",
          retries: FILE_EXTRACTION_LIMITS.storageRetries,
          signal,
          timeout: FILE_EXTRACTION_LIMITS.storageTimeoutMs,
        });
        return stored.stream();
      },
      {
        contentType: source.contentType,
        etag: metadata.etag,
        filename: source.filename,
        id: source.objectKey,
        size: source.size,
      },
    );
  },
  writeResult: (ctx, job, result) =>
    ctx.runMutation(internal.fileExtraction.storeResult, {
      format: result.format,
      inputBytes: result.source.byteLength,
      ...jobIdentity(job),
      text: result.markdown,
    }),
});

export const process = internalAction({
  args: jobArgs,
  handler: async (ctx, job): Promise<FileIngestionResult> =>
    ingestionHandler(ctx, job),
});
