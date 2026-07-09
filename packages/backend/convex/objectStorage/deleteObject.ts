"use node";

import { Files } from "files-sdk";
import { s3 } from "files-sdk/s3";
import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import {
  getFilesBucketName,
  getFilesForcePathStyle,
  requireFilesEnv,
} from "./config";

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
  handler: async (_ctx, { objectKey }) => {
    await getFiles().delete(objectKey);
    return { deleted: true };
  },
});
