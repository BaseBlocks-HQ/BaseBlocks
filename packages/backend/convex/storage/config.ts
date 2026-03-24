import { ConvexError } from "convex/values";

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new ConvexError(`Missing ${name}`);
  }
  return value;
}

export function getStorageBucketName(): string {
  return requireEnv("STORAGE_BUCKET_NAME");
}

export function getStorageEndpoint(): string {
  return requireEnv("STORAGE_ENDPOINT");
}

export function getStorageRegion(): string {
  return requireEnv("STORAGE_REGION");
}

export function getStorageAccessKeyId(): string {
  return requireEnv("STORAGE_ACCESS_KEY_ID");
}

export function getStorageSecretAccessKey(): string {
  return requireEnv("STORAGE_SECRET_ACCESS_KEY");
}
