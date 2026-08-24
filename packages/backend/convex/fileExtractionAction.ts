"use node";

import { iterableSource } from "@baseblocks/anydoc-contracts/sources";
import { NonRetryableError } from "@convex-dev/workpool";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";
import type { FileIngestionJob, FileIngestionResult } from "./fileExtraction";
import {
  classifyIngestionFailure,
  createAttempt,
  DEFAULT_ATTEMPT_TIMEOUT_MS,
  ingestStoredDocument,
  validTimeout,
} from "./fileExtractionParser";
import { encodeConvexIngestionFailure } from "./fileExtractionQueue";
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

export const process = internalAction({
  args: jobArgs,
  handler: async (ctx, job): Promise<FileIngestionResult> => {
    const timeout = validTimeout(
      job.attemptTimeoutMs ?? DEFAULT_ATTEMPT_TIMEOUT_MS,
    );
    const attempt = createAttempt(timeout, Date.now);
    try {
      const resolveSource = ctx.runMutation(
        internal.fileExtraction.markProcessing,
        jobIdentity(job),
      );
      const source = await Promise.race([resolveSource, attempt.aborted]);
      if (!source) {
        throw Object.assign(new Error("The file source changed"), {
          code: "source-changed",
          retryable: false,
        });
      }
      const storage = getStorage();
      const metadata = await storage.head(source.objectKey, {
        retries: FILE_EXTRACTION_LIMITS.storageRetries,
        signal: attempt.value.signal,
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
      const documentSource = iterableSource(
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

      const resultPromise = ingestStoredDocument(documentSource, {
        ...(job.contentType === undefined
          ? {}
          : { contentType: job.contentType }),
        deadline: attempt.value.deadline,
        ...(job.expectedSha256 === undefined
          ? {}
          : { expectedSha256: job.expectedSha256 }),
        ...(job.expectedSize === undefined
          ? {}
          : { expectedSize: job.expectedSize }),
        ...(job.filename === undefined ? {} : { filename: job.filename }),
        ...(job.format === undefined ? {} : { format: job.format }),
        ...(job.maxBytes === undefined ? {} : { maxBytes: job.maxBytes }),
        maxTextBytes: FILE_EXTRACTION_LIMITS.maxOutputBytes,
        signal: attempt.value.signal,
      });
      const result = await Promise.race([resultPromise, attempt.aborted]);

      const write = await Promise.race([
        ctx.runMutation(internal.fileExtraction.storeResult, {
          format: result.format,
          inputBytes: result.source.byteLength,
          ...jobIdentity(job),
          text: result.markdown,
        }),
        attempt.aborted,
      ]);
      return {
        byteLength: result.source.byteLength,
        format: result.format,
        sha256: result.source.sha256,
        status: write.status,
      };
    } catch (cause) {
      const { code, terminal } = classifyIngestionFailure(cause);
      const failure = Object.assign(
        new Error(
          cause instanceof Error ? cause.message : "AnyDoc ingestion failed.",
          { cause },
        ),
        {
          code,
          retryable: !terminal,
          ...(job.format === undefined ? {} : { format: job.format }),
          ...(job.maxBytes === undefined ? {} : { maxBytes: job.maxBytes }),
          ...(job.expectedSize === undefined
            ? {}
            : { expectedSize: job.expectedSize }),
        },
      );
      const encoded = encodeConvexIngestionFailure(failure);
      if (terminal) {
        throw new NonRetryableError(encoded, { cause });
      }
      throw new Error(encoded, { cause });
    } finally {
      attempt.dispose();
    }
  },
});
