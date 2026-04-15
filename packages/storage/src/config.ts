const DEFAULT_STORAGE_DRIVER = "s3-compatible";
const DEFAULT_STORAGE_PROVIDER = "s3-compatible";

export interface StorageConfig {
  driver: "s3-compatible";
  provider: string;
  bucket: string;
  endpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle: boolean;
  maxUploadSizeBytes: number | null;
}

function requireEnv(
  env: NodeJS.ProcessEnv,
  name: string,
  context: string,
): string {
  const value = env[name]?.trim();
  if (!value) {
    throw new Error(`Missing ${name} in the ${context}`);
  }
  return value;
}

function parseOptionalPositiveInteger(
  rawValue: string | undefined,
  name: string,
): number | null {
  const value = rawValue?.trim();
  if (!value) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`${name} must be a non-negative integer`);
  }

  return parsed;
}

function parseBoolean(rawValue: string | undefined, defaultValue: boolean) {
  const value = rawValue?.trim().toLowerCase();
  if (!value) {
    return defaultValue;
  }

  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  throw new Error("STORAGE_FORCE_PATH_STYLE must be true or false");
}

export function readStorageConfigFromEnv(
  env: NodeJS.ProcessEnv = process.env,
  context = "server environment",
): StorageConfig {
  const rawDriver = env.STORAGE_DRIVER?.trim() || DEFAULT_STORAGE_DRIVER;
  if (rawDriver !== DEFAULT_STORAGE_DRIVER) {
    throw new Error(
      `Unsupported STORAGE_DRIVER "${rawDriver}". Supported drivers: ${DEFAULT_STORAGE_DRIVER}`,
    );
  }

  return {
    driver: DEFAULT_STORAGE_DRIVER,
    provider: env.STORAGE_PROVIDER?.trim() || DEFAULT_STORAGE_PROVIDER,
    bucket: requireEnv(env, "STORAGE_BUCKET_NAME", context),
    endpoint: requireEnv(env, "STORAGE_ENDPOINT", context),
    region: requireEnv(env, "STORAGE_REGION", context),
    accessKeyId: requireEnv(env, "STORAGE_ACCESS_KEY_ID", context),
    secretAccessKey: requireEnv(env, "STORAGE_SECRET_ACCESS_KEY", context),
    forcePathStyle: parseBoolean(env.STORAGE_FORCE_PATH_STYLE, true),
    maxUploadSizeBytes: parseOptionalPositiveInteger(
      env.STORAGE_MAX_UPLOAD_SIZE_BYTES,
      "STORAGE_MAX_UPLOAD_SIZE_BYTES",
    ),
  };
}

export function getStorageBucketNameFromEnv(env?: NodeJS.ProcessEnv): string {
  return readStorageConfigFromEnv(env).bucket;
}

export function getStorageProviderNameFromEnv(env?: NodeJS.ProcessEnv): string {
  return readStorageConfigFromEnv(env).provider;
}

export function getStorageMaxUploadSizeFromEnv(
  env?: NodeJS.ProcessEnv,
): number | null {
  return readStorageConfigFromEnv(env).maxUploadSizeBytes;
}
