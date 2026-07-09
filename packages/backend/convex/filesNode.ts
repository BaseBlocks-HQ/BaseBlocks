"use node";

import { Files } from "files-sdk";
import { s3 } from "files-sdk/s3";
import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import {
  getFilesBucketName,
  requireFilesEnv,
} from "./files";

function getFilesForcePathStyle(): boolean {
  const raw = process.env.FILES_FORCE_PATH_STYLE?.trim().toLowerCase();
  if (!raw) {
    return true;
  }
  if (raw === "true") {
    return true;
  }
  if (raw === "false") {
    return false;
  }
  throw new Error("FILES_FORCE_PATH_STYLE must be true or false");
}

function getFiles() {
  const adapter = process.env.FILES_ADAPTER?.trim() || "s3";
  if (adapter !== "s3") {
    throw new Error(`Unsupported FILES_ADAPTER "${adapter}"`);
  }

  return new Files({
    adapter: s3({
      bucket: getFilesBucketName(),
      endpoint: requireFilesEnv("FILES_ENDPOINT"),
      region: requireFilesEnv("FILES_REGION"),
      forcePathStyle: getFilesForcePathStyle(),
      credentials: {
        accessKeyId: requireFilesEnv("FILES_ACCESS_KEY_ID"),
        secretAccessKey: requireFilesEnv("FILES_SECRET_ACCESS_KEY"),
      },
    }),
  });
}

export const deleteObject = internalAction({
  args: {
    objectKey: v.string(),
  },
  returns: v.object({ deleted: v.boolean() }),
  handler: async (_ctx, { objectKey }) => {
    await getFiles().delete(objectKey);
    return { deleted: true };
  },
});
