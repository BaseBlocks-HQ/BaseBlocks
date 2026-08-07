"use node";

import { iterableSource, readSource } from "@baseblocks/anydoc/sources";
import { Files } from "files-sdk";
import { s3 } from "files-sdk/s3";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { internalAction } from "./_generated/server";
import {
  FILE_EXTRACTION_LIMITS,
  type FileExtractionFailure,
  validateExtractionInputSize,
  validateExtractionOutput,
  validateStoredSourceMetadata,
} from "./model/fileExtraction";
import {
  AnyDocIntegrationError,
  type AnyDocErrorCode,
  loadAnyDocNode,
} from "./model/anyDocAdapter";

type ClaimedJob = {
  jobId: Id<"fileExtractionJobs">;
  runToken: string;
  fileId: string;
  objectKey: string;
  filename: string;
  contentType: string;
  size: number;
  checksum?: string;
  attempt: number;
  deadlineAt: number;
};

type ProcessResult =
  | { status: "ignored" | "ready" }
  | { status: "failed"; failure: FileExtractionFailure };

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

function safeMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.replaceAll(/[\r\n\t]+/gu, " ").slice(0, 500);
}

const anyDocFailureCodes = new Set<AnyDocErrorCode>([
  "unsupported",
  "malformed",
  "encrypted",
  "resourceLimit",
  "missingPart",
  "io",
]);

function extractionFailure(error: unknown): FileExtractionFailure {
  const rawCode =
    error && typeof error === "object" && "code" in error
      ? (error as { code?: unknown }).code
      : undefined;
  if (
    typeof rawCode === "string" &&
    anyDocFailureCodes.has(rawCode as AnyDocErrorCode)
  ) {
    return {
      code:
        rawCode === "resourceLimit"
          ? "resource_limit"
          : rawCode === "missingPart"
            ? "missing_part"
            : rawCode,
      message: safeMessage(error),
      retryable: rawCode === "io",
    };
  }
  if (error instanceof AnyDocIntegrationError) {
    return {
      code: error.code,
      message: safeMessage(error),
      retryable: false,
    };
  }
  return {
    code: "extraction_error",
    message: safeMessage(error),
    retryable: true,
  };
}

function isPlainText(contentType: string): boolean {
  const normalized = contentType.split(";", 1)[0]?.trim().toLowerCase();
  return (
    normalized?.startsWith("text/") === true ||
    normalized === "application/json" ||
    normalized === "application/xml"
  );
}

function deadlineFailure(): FileExtractionFailure {
  return {
    code: "execution_deadline",
    message: "Extraction exceeded its bounded execution deadline",
    retryable: true,
  };
}

function expectedSha256(checksum: string | undefined): string | undefined {
  return checksum && /^[a-f\d]{64}$/iu.test(checksum)
    ? checksum.toLowerCase()
    : undefined;
}

function sourceReadFailure(error: unknown): FileExtractionFailure {
  const code =
    error && typeof error === "object" && "code" in error
      ? String((error as { code?: unknown }).code)
      : undefined;
  if (code === "deadline-exceeded") return deadlineFailure();
  if (code === "too-large") {
    return {
      code: "input_too_large",
      message: safeMessage(error),
      retryable: false,
      limit: FILE_EXTRACTION_LIMITS.maxInputBytes,
    };
  }
  if (code === "integrity-failed" || code === "source-changed") {
    return {
      code: "source_mismatch",
      message: safeMessage(error),
      retryable: false,
    };
  }
  return {
    code: code === "invalid-source" ? "invalid_source" : "storage_error",
    message: safeMessage(error),
    retryable: code !== "invalid-source",
  };
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
        new Error(`Invalid UTF-8 text: ${safeMessage(error)}`),
        {
          code: "malformed" satisfies AnyDocErrorCode,
        },
      );
    }
  }
  const extension = filename.includes(".")
    ? (filename.split(".").pop() ?? "")
    : "";
  const anyDoc = await loadAnyDocNode();
  const format = anyDoc.formatFromExtension(extension);
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
    if (!claim) return { status: "ignored" as const };

    if (Date.now() > claim.deadlineAt) {
      const failure = deadlineFailure();
      await ctx.runMutation(internal.fileExtraction.fail, {
        jobId,
        runToken,
        failure,
      });
      return { status: "failed" as const, failure };
    }

    const declaredSizeFailure = validateExtractionInputSize(claim.size);
    if (declaredSizeFailure) {
      await ctx.runMutation(internal.fileExtraction.fail, {
        jobId,
        runToken,
        failure: declaredSizeFailure,
      });
      return { status: "failed" as const, failure: declaredSizeFailure };
    }

    let bytes: Uint8Array;
    try {
      const metadata = await getFiles().head(claim.objectKey, {
        timeout: FILE_EXTRACTION_LIMITS.storageTimeoutMs,
        retries: FILE_EXTRACTION_LIMITS.storageRetries,
      });
      const metadataFailure = validateStoredSourceMetadata(claim, metadata);
      if (metadataFailure) {
        await ctx.runMutation(internal.fileExtraction.fail, {
          jobId,
          runToken,
          failure: metadataFailure,
        });
        return { status: "failed" as const, failure: metadataFailure };
      }
      const stored = await getFiles().download(claim.objectKey, {
        as: "stream",
        timeout: FILE_EXTRACTION_LIMITS.storageTimeoutMs,
        retries: FILE_EXTRACTION_LIMITS.storageRetries,
      });
      const source = iterableSource(() => stored.stream(), {
        contentType: claim.contentType,
        etag: metadata.etag,
        filename: claim.filename,
        id: claim.objectKey,
        size: stored.size,
      });
      bytes = (
        await readSource(source, {
          deadline: claim.deadlineAt,
          expectedSha256: expectedSha256(claim.checksum),
          expectedSize: claim.size,
          maxBytes: FILE_EXTRACTION_LIMITS.maxInputBytes,
        })
      ).bytes;
    } catch (error) {
      const message = safeMessage(error);
      const configuration =
        message.startsWith("Missing FILES_") ||
        message.startsWith("Unsupported FILES_ADAPTER") ||
        message.startsWith("FILES_FORCE_PATH_STYLE");
      const failure: FileExtractionFailure = configuration
        ? { code: "configuration_error", message, retryable: false }
        : sourceReadFailure(error);
      await ctx.runMutation(internal.fileExtraction.fail, {
        jobId,
        runToken,
        failure,
      });
      return { status: "failed" as const, failure };
    }

    const actualSizeFailure = validateExtractionInputSize(bytes.byteLength);
    if (actualSizeFailure) {
      await ctx.runMutation(internal.fileExtraction.fail, {
        jobId,
        runToken,
        failure: actualSizeFailure,
      });
      return { status: "failed" as const, failure: actualSizeFailure };
    }

    if (Date.now() > claim.deadlineAt) {
      const failure = deadlineFailure();
      await ctx.runMutation(internal.fileExtraction.fail, {
        jobId,
        runToken,
        failure,
      });
      return { status: "failed" as const, failure };
    }

    const renewed = (await ctx.runMutation(internal.fileExtraction.renewLease, {
      jobId,
      runToken,
    })) as { deadlineAt: number } | null;
    if (!renewed) return { status: "ignored" as const };

    try {
      const extracted = await extractText(
        bytes,
        claim.filename,
        claim.contentType,
      );
      if (Date.now() > renewed.deadlineAt) {
        const failure = deadlineFailure();
        await ctx.runMutation(internal.fileExtraction.fail, {
          jobId,
          runToken,
          failure,
        });
        return { status: "failed" as const, failure };
      }
      const outputFailure = validateExtractionOutput(extracted.text);
      if (outputFailure) {
        await ctx.runMutation(internal.fileExtraction.fail, {
          jobId,
          runToken,
          failure: outputFailure,
        });
        return { status: "failed" as const, failure: outputFailure };
      }
      const completed: { applied: boolean } = await ctx.runMutation(
        internal.fileExtraction.complete,
        {
          jobId,
          runToken,
          text: extracted.text,
          format: extracted.format,
          inputBytes: bytes.byteLength,
        },
      );
      return {
        status: completed.applied ? ("ready" as const) : ("ignored" as const),
      };
    } catch (error) {
      const failure = extractionFailure(error);
      await ctx.runMutation(internal.fileExtraction.fail, {
        jobId,
        runToken,
        failure,
      });
      return { status: "failed" as const, failure };
    }
  },
});
