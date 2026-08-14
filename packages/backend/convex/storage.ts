"use node";

import { Files } from "files-sdk";
import { s3 } from "files-sdk/s3";

function requiredEnv(name: string): string {
  const value = globalThis.process.env[name]?.trim();
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

function forcePathStyle(): boolean {
  const value =
    globalThis.process.env.FILES_FORCE_PATH_STYLE?.trim().toLowerCase();
  if (!value || value === "true") return true;
  if (value === "false") return false;
  throw new Error("FILES_FORCE_PATH_STYLE must be true or false");
}

let storage: Files | undefined;

export function getStorage(): Files {
  if (storage) return storage;
  const adapter = globalThis.process.env.FILES_ADAPTER?.trim() || "s3";
  if (adapter !== "s3") {
    throw new Error(`Unsupported FILES_ADAPTER "${adapter}"`);
  }
  storage = new Files({
    adapter: s3({
      bucket: requiredEnv("FILES_BUCKET"),
      endpoint: requiredEnv("FILES_ENDPOINT"),
      region: requiredEnv("FILES_REGION"),
      forcePathStyle: forcePathStyle(),
      credentials: {
        accessKeyId: requiredEnv("FILES_ACCESS_KEY_ID"),
        secretAccessKey: requiredEnv("FILES_SECRET_ACCESS_KEY"),
      },
    }),
  });
  return storage;
}
