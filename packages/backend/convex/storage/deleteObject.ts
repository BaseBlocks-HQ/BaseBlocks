"use node";

import { DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import {
  getStorageAccessKeyId,
  getStorageEndpoint,
  getStorageRegion,
  getStorageSecretAccessKey,
} from "./config";

let storageClient: S3Client | null = null;

function getStorageClient(): S3Client {
  if (storageClient) {
    return storageClient;
  }

  storageClient = new S3Client({
    region: getStorageRegion(),
    endpoint: getStorageEndpoint(),
    forcePathStyle: true,
    credentials: {
      accessKeyId: getStorageAccessKeyId(),
      secretAccessKey: getStorageSecretAccessKey(),
    },
  });

  return storageClient;
}

export const deleteObject = internalAction({
  args: {
    bucket: v.string(),
    objectKey: v.string(),
  },
  handler: async (_ctx, { bucket, objectKey }) => {
    await getStorageClient().send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: objectKey,
      }),
    );

    return { deleted: true };
  },
});
