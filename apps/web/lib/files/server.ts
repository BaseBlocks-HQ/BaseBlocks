import { Files } from "files-sdk";
import { s3 } from "files-sdk/s3";

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

function getFilesForcePathStyle(): boolean {
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

export function getFiles() {
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

export async function readFileBytes(key: string): Promise<Uint8Array> {
  const file = await getFiles().download(key);
  return new Uint8Array(await file.arrayBuffer());
}

export async function getFileUrl(args: {
  key: string;
  expiresIn?: number;
}): Promise<string> {
  return await getFiles().url(args.key, {
    expiresIn: args.expiresIn,
  });
}

export async function deleteFile(key: string): Promise<void> {
  await getFiles().delete(key);
}
