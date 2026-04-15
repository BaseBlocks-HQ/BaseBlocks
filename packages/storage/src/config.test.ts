import { describe, expect, test } from "bun:test";
import {
  getStorageBucketNameFromEnv,
  getStorageMaxUploadSizeFromEnv,
  getStorageProviderNameFromEnv,
  readStorageConfigFromEnv,
} from "./config";

const baseEnv = {
  STORAGE_BUCKET_NAME: "bucket-name",
  STORAGE_ENDPOINT: "https://storage.example.com",
  STORAGE_REGION: "auto",
  STORAGE_ACCESS_KEY_ID: "access-key",
  STORAGE_SECRET_ACCESS_KEY: "secret-key",
};

describe("storage config", () => {
  test("reads the default s3-compatible configuration", () => {
    const config = readStorageConfigFromEnv(baseEnv);

    expect(config.driver).toBe("s3-compatible");
    expect(config.provider).toBe("s3-compatible");
    expect(config.bucket).toBe("bucket-name");
    expect(config.endpoint).toBe("https://storage.example.com");
    expect(config.forcePathStyle).toBe(true);
    expect(config.maxUploadSizeBytes).toBeNull();
  });

  test("supports provider labels and upload caps from env", () => {
    const env = {
      ...baseEnv,
      STORAGE_PROVIDER: "railway",
      STORAGE_FORCE_PATH_STYLE: "false",
      STORAGE_MAX_UPLOAD_SIZE_BYTES: "104857600",
    };

    expect(getStorageProviderNameFromEnv(env)).toBe("railway");
    expect(getStorageBucketNameFromEnv(env)).toBe("bucket-name");
    expect(getStorageMaxUploadSizeFromEnv(env)).toBe(104857600);
    expect(readStorageConfigFromEnv(env).forcePathStyle).toBe(false);
  });
});
