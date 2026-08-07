"use node";

import { executeIngestion } from "@baseblocks/anydoc/ingestion";
import { iterableSource } from "@baseblocks/anydoc/sources";
import { v } from "convex/values";
import { Files } from "files-sdk";
import { s3 } from "files-sdk/s3";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { internalAction } from "./_generated/server";
import {
  FILE_EXTRACTION_LIMITS,
  type FileExtractionFailure,
  validateStoredSourceMetadata,
} from "./model/fileExtraction";
import {
  type AnyDocErrorCode,
  errorCauses,
  loadAnyDocNode,
  mapAnyDocIngestionFailure,
  safeErrorMessage,
} from "./model/anyDocAdapter";

type ClaimedJob = {
  jobId: Id<"fileExtractionJobs">;
  runToken: string;
  objectKey: string;
  filename: string;
  contentType: string;
  size: number;
  checksum?: string;
  deadlineAt: number;
};

type ProcessResult =
  | { status: "ignored" | "ready" }
  | { status: "failed"; failure: FileExtractionFailure };

class LeaseLostError extends Error {}

class SourceValidationError extends Error {
  constructor(readonly failure: FileExtractionFailure) {
    super(failure.message);
  }
}

function requiredEnv(name: string): string {
  const value = globalThis.process.env[name]?.trim();
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

function forcePathStyle(): boolean {
  const value =
    globalThis.process.env.FILES_FORCE_PATH_STYLE?.trim().toLowerCase();
  if (!value || value === "true") return true;
  if (value === "false") return false;
  throw new Error("FILES_FORCE_PATH_STYLE must be true or false");
}

let files: Files | undefined;

function getFiles(): Files {
  if (files) return files;
  const adapter = globalThis.process.env.FILES_ADAPTER?.trim() || "s3";
  if (adapter !== "s3") {
    throw new Error(`Unsupported FILES_ADAPTER "${adapter}"`);
  }
  files = new Files({
    adapter: s3({
      bucket: requiredEnv("FILES_BUCKET"),
      endpoint: requiredEnv("FILES_ENDPOINT"),
      region: requiredEnv("FILES_REGION"),
      forcePathStyle: forcePathStyle(),
      credentials: {
        accessKeyId: requiredEnv("FILES_ACCESS_KEY_ID"),
        secretAccessKey: requiredEnv("FILES_SECRET_ACCESS_KEY"),
      },
    }),
  });
  return files;
}

function isPlainText(contentType: string): boolean {
  const normalized = contentType.split(";", 1)[0]?.trim().toLowerCase();
  return (
    normalized?.startsWith("text/") === true ||
    normalized === "application/json" ||
    normalized === "application/xml"
  );
}

function expectedSha256(checksum: string | undefined): string | undefined {
  return checksum && /^[a-f\d]{64}$/iu.test(checksum)
    ? checksum.toLowerCase()
    : undefined;
}

function formatFromFilename(filename: string): string {
  const extension = filename.includes(".")
    ? (filename.split(".").pop() ?? "")
    : "";
  return extension || "detected";
}

async function extractText(
  bytes: Uint8Array,
  filename: string,
  contentType: string,
): Promise<{ text: string; format: string }> {
  if (isPlainText(contentType)) {
    try {
      return {
        text: new TextDecoder("utf-8", { fatal: true }).decode(bytes),
        format: "text",
      };
    } catch (error) {
      throw Object.assign(
        new Error(`Invalid UTF-8 text: ${safeErrorMessage(error)}`),
        { code: "malformed" satisfies AnyDocErrorCode },
      );
    }
  }
  const anyDoc = await loadAnyDocNode();
  const format = anyDoc.formatFromExtension(formatFromFilename(filename));
  return {
    text: await anyDoc.toMarkdownBytes(bytes, format),
    format: format ?? "detected",
  };
}

export const process = internalAction({
  args: {
    jobId: v.id("fileExtractionJobs"),
    runToken: v.string(),
  },
  handler: async (ctx, { jobId, runToken }): Promise<ProcessResult> => {
    const claim = (await ctx.runMutation(internal.fileExtraction.getClaimed, {
      jobId,
      runToken,
    })) as ClaimedJob | null;
    if (!claim) return { status: "ignored" };

    try {
      const result = await executeIngestion({
        source: claim.objectKey,
        format: formatFromFilename(claim.filename),
        expectedSize: claim.size,
        expectedSha256: expectedSha256(claim.checksum),
        maxBytes: FILE_EXTRACTION_LIMITS.maxInputBytes,
        deadline: claim.deadlineAt,
        idempotencyKey: claim.jobId,
        artifactLimits: {
          maxArtifactBytes: FILE_EXTRACTION_LIMITS.maxOutputBytes + 1_024,
          maxTextBytes: FILE_EXTRACTION_LIMITS.maxOutputBytes,
          maxBinaryBytes: 0,
          maxSinkResultBytes: 1_024,
          maxEntries: 16,
          maxDepth: 8,
        },
        resolveSource: async () => {
          const storage = getFiles();
          const metadata = await storage.head(claim.objectKey, {
            timeout: FILE_EXTRACTION_LIMITS.storageTimeoutMs,
            retries: FILE_EXTRACTION_LIMITS.storageRetries,
          });
          const failure = validateStoredSourceMetadata(claim, metadata);
          if (failure) throw new SourceValidationError(failure);
          const stored = await storage.download(claim.objectKey, {
            as: "stream",
            timeout: FILE_EXTRACTION_LIMITS.storageTimeoutMs,
            retries: FILE_EXTRACTION_LIMITS.storageRetries,
          });
          return iterableSource(() => stored.stream(), {
            contentType: claim.contentType,
            etag: metadata.etag,
            filename: claim.filename,
            id: claim.objectKey,
            size: stored.size,
          });
        },
        process: async ({ bytes }) => {
          const extracted = await extractText(
            bytes,
            claim.filename,
            claim.contentType,
          );
          return { content: extracted.text, format: extracted.format };
        },
        contentSink: {
          write: async ({ artifact }) => {
            if (
              typeof artifact.content !== "string" ||
              typeof artifact.format !== "string"
            ) {
              throw new Error("AnyDoc returned an invalid extraction artifact");
            }
            return ctx.runMutation(internal.fileExtraction.complete, {
              jobId,
              runToken,
              text: artifact.content,
              format: artifact.format,
              inputBytes: claim.size,
            }) as Promise<{ applied: boolean }>;
          },
        },
        onPhase: async () => {
          const renewed = await ctx.runMutation(
            internal.fileExtraction.renewLease,
            { jobId, runToken },
          );
          if (!renewed) throw new LeaseLostError();
        },
      });
      const completed = result.output.content as { applied: boolean };
      return { status: completed.applied ? "ready" : "ignored" };
    } catch (error) {
      if (error instanceof LeaseLostError) return { status: "ignored" };
      const causes = errorCauses(error);
      const message = safeErrorMessage(error);
      const sourceValidation = causes.find(
        (cause): cause is SourceValidationError =>
          cause instanceof SourceValidationError,
      );
      const configuration = causes.some(
        (cause) =>
          cause instanceof Error &&
          (cause.message.startsWith("Missing FILES_") ||
            cause.message.startsWith("Unsupported FILES_ADAPTER") ||
            cause.message.startsWith("FILES_FORCE_PATH_STYLE")),
      );
      const failure = sourceValidation
        ? sourceValidation.failure
        : configuration
          ? { code: "configuration_error", message, retryable: false }
          : mapAnyDocIngestionFailure(error, FILE_EXTRACTION_LIMITS);
      await ctx.runMutation(internal.fileExtraction.fail, {
        jobId,
        runToken,
        failure,
      });
      return { status: "failed", failure };
    }
  },
});
