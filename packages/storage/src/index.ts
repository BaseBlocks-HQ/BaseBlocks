import {
  type StorageConfig,
  getStorageBucketNameFromEnv,
  getStorageMaxUploadSizeFromEnv,
  getStorageProviderNameFromEnv,
  readStorageConfigFromEnv,
} from "./config";
import { createObjectKey, toAttachmentContentDisposition } from "./object-key";
import type {
  SignedUpload,
  StorageObjectMetadata,
  StorageProvider,
} from "./provider";
import { S3CompatibleStorageProvider } from "./s3-compatible-storage-provider";

let cachedProvider: StorageProvider | null = null;

export function createStorageProvider(config: StorageConfig): StorageProvider {
  return new S3CompatibleStorageProvider(config);
}

export function getStorageProviderFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): StorageProvider {
  if (env === process.env && cachedProvider) {
    return cachedProvider;
  }

  const provider = createStorageProvider(readStorageConfigFromEnv(env));
  if (env === process.env) {
    cachedProvider = provider;
  }

  return provider;
}

export {
  createObjectKey,
  getStorageBucketNameFromEnv,
  getStorageMaxUploadSizeFromEnv,
  getStorageProviderNameFromEnv,
  readStorageConfigFromEnv,
  toAttachmentContentDisposition,
};
export type {
  SignedUpload,
  StorageConfig,
  StorageObjectMetadata,
  StorageProvider,
};
