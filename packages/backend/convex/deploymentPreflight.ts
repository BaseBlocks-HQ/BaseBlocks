"use node";

import { internalAction } from "./_generated/server";
import { loadAnyDocNode } from "./model/anyDocAdapter";

const REQUIRED_FILE_ENV = [
  "FILES_BUCKET",
  "FILES_ENDPOINT",
  "FILES_REGION",
  "FILES_ACCESS_KEY_ID",
  "FILES_SECRET_ACCESS_KEY",
] as const;

export const checkFileExtractionEnvironment = internalAction({
  args: {},
  handler: async () => {
    const adapter = process.env.FILES_ADAPTER?.trim() || "s3";
    if (adapter !== "s3") {
      throw new Error(
        `Unsupported FILES_ADAPTER "${adapter}"; file extraction currently requires s3`,
      );
    }
    const missing = REQUIRED_FILE_ENV.filter(
      (name) => !process.env[name]?.trim(),
    );
    if (missing.length > 0) {
      throw new Error(
        `Convex file extraction environment is incomplete; missing ${missing.join(", ")}`,
      );
    }
    const forcePathStyle =
      process.env.FILES_FORCE_PATH_STYLE?.trim().toLowerCase();
    if (
      forcePathStyle !== undefined &&
      forcePathStyle !== "true" &&
      forcePathStyle !== "false"
    ) {
      throw new Error("FILES_FORCE_PATH_STYLE must be true or false");
    }
    const anyDoc = await loadAnyDocNode();
    if (anyDoc.formatFromExtension("docx") !== "docx") {
      throw new Error(
        "AnyDoc Node format detection failed its deployment check",
      );
    }
    return {
      adapter,
      anyDocNode: true,
      configured: REQUIRED_FILE_ENV.map((name) => name),
      forcePathStyle: forcePathStyle ?? "true",
    };
  },
});
