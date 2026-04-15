import {
  getStorageBucketNameFromEnv,
  getStorageProviderNameFromEnv,
  readStorageConfigFromEnv,
} from "@baseblocks/storage";

export function getStorageBucketName(): string {
  return getStorageBucketNameFromEnv();
}

export function getStorageEndpoint(): string {
  return readStorageConfigFromEnv().endpoint;
}

export function getStorageRegion(): string {
  return readStorageConfigFromEnv().region;
}

export function getStorageAccessKeyId(): string {
  return readStorageConfigFromEnv().accessKeyId;
}

export function getStorageSecretAccessKey(): string {
  return readStorageConfigFromEnv().secretAccessKey;
}

export function getStorageProviderName(): string {
  return getStorageProviderNameFromEnv();
}
