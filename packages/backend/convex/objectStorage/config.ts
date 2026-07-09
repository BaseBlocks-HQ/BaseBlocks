export function requireFilesEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing ${name}`);
  }
  return value;
}

export function getFilesBucketName(): string {
  return requireFilesEnv("FILES_BUCKET");
}

export function getFilesProviderName(): string {
  return process.env.FILES_ADAPTER?.trim() || "s3";
}

export function getFilesMaxUploadSize(): number | null {
  const raw = process.env.FILES_MAX_UPLOAD_SIZE_BYTES?.trim();
  if (!raw) {
    return null;
  }

  const parsed = Number(raw);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error("FILES_MAX_UPLOAD_SIZE_BYTES must be a positive integer");
  }

  return parsed;
}

export function getFilesForcePathStyle(): boolean {
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
