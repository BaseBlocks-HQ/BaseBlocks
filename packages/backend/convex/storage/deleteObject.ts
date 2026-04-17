"use node";

import { getStorageProviderFromEnv } from "@baseblocks/storage/node";
import { v } from "convex/values";
import { internalAction } from "../_generated/server";
const storageProvider = getStorageProviderFromEnv();

export const deleteObject = internalAction({
  args: {
    bucket: v.string(),
    objectKey: v.string(),
  },
  handler: async (_ctx, { bucket, objectKey }) => {
    await storageProvider.deleteObject({ bucket, objectKey });

    return { deleted: true };
  },
});
