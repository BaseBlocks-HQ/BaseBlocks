import "server-only";

import { Files } from "files-sdk";
import { s3 } from "files-sdk/s3";

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

function forcePathStyle(): boolean {
  const value = process.env.FILES_FORCE_PATH_STYLE?.trim().toLowerCase();
  if (!value || value === "true") return true;
  if (value === "false") return false;
  throw new Error("FILES_FORCE_PATH_STYLE must be true or false");
}

export function getMaxUploadSize(): number {
  const value = process.env.FILES_MAX_UPLOAD_SIZE_BYTES?.trim();
  if (!value) return 100 * 1024 * 1024;
  const size = Number(value);
  if (!Number.isSafeInteger(size) || size <= 0) {
    throw new Error("FILES_MAX_UPLOAD_SIZE_BYTES must be a positive integer");
  }
  return size;
}

const globalFiles = globalThis as typeof globalThis & {
  baseblocksFiles?: Files;
};

export function getFiles(): Files {
  if (globalFiles.baseblocksFiles) return globalFiles.baseblocksFiles;

  const adapter = process.env.FILES_ADAPTER?.trim() || "s3";
  if (adapter !== "s3")
    throw new Error(`Unsupported FILES_ADAPTER "${adapter}"`);

  const files = new Files({
    adapter: s3({
      bucket: requireEnv("FILES_BUCKET"),
      endpoint: requireEnv("FILES_ENDPOINT"),
      region: requireEnv("FILES_REGION"),
      forcePathStyle: forcePathStyle(),
      credentials: {
        accessKeyId: requireEnv("FILES_ACCESS_KEY_ID"),
        secretAccessKey: requireEnv("FILES_SECRET_ACCESS_KEY"),
      },
    }),
  });
  globalFiles.baseblocksFiles = files;
  return files;
}

export async function deleteObject(key: string): Promise<void> {
  await getFiles().delete(key);
}

export async function headObject(key: string) {
  return await getFiles().head(key);
}

export async function signedDownloadUrl(
  key: string,
  options?: { expiresIn?: number; download?: boolean },
): Promise<string> {
  return await getFiles().url(key, {
    expiresIn: options?.expiresIn,
    responseContentDisposition: options?.download ? "attachment" : undefined,
  });
}
