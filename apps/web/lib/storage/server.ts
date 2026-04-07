import { Readable } from "node:stream";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { UploadPurpose } from "@baseblocks/types";

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(
      `Missing ${name} in the web server environment (for local dev, set it in apps/web/.env.local)`,
    );
  }
  return value;
}

function getStorageBucketName(): string {
  return requireEnv("STORAGE_BUCKET_NAME");
}

function sanitizeFilename(filename: string): string {
  const trimmed = filename.trim();
  if (!trimmed) {
    return "file";
  }

  return trimmed.replace(/[^a-zA-Z0-9._-]/g, "_");
}

let storageClient: S3Client | null = null;

function getStorageClient(): S3Client {
  if (storageClient) {
    return storageClient;
  }

  storageClient = new S3Client({
    region: requireEnv("STORAGE_REGION"),
    endpoint: requireEnv("STORAGE_ENDPOINT"),
    forcePathStyle: true,
    credentials: {
      accessKeyId: requireEnv("STORAGE_ACCESS_KEY_ID"),
      secretAccessKey: requireEnv("STORAGE_SECRET_ACCESS_KEY"),
    },
  });

  return storageClient;
}

export function createObjectKey(args: {
  siteId: string;
  purpose: UploadPurpose;
  filename: string;
}): string {
  const now = new Date();
  const month = `${now.getUTCMonth() + 1}`.padStart(2, "0");
  const day = `${now.getUTCDate()}`.padStart(2, "0");
  const datePrefix = `${now.getUTCFullYear()}/${month}/${day}`;
  const id = crypto.randomUUID();

  return [
    "sites",
    args.siteId,
    args.purpose === "document" ? "documents" : "assets",
    datePrefix,
    `${id}-${sanitizeFilename(args.filename)}`,
  ].join("/");
}

export async function readObjectBytes(args: {
  bucket: string;
  objectKey: string;
}): Promise<Uint8Array> {
  const response = await getStorageClient().send(
    new GetObjectCommand({
      Bucket: args.bucket,
      Key: args.objectKey,
    }),
  );

  if (!response.Body) {
    throw new Error(`Missing object body for ${args.objectKey}`);
  }

  return await response.Body.transformToByteArray();
}

export async function uploadObject(args: {
  bucket?: string;
  objectKey: string;
  contentType: string;
  body: Uint8Array;
}): Promise<void> {
  await getStorageClient().send(
    new PutObjectCommand({
      Bucket: args.bucket ?? getStorageBucketName(),
      Key: args.objectKey,
      ContentType: args.contentType,
      Body: args.body,
    }),
  );
}

/**
 * Stream a Web ReadableStream directly to storage without buffering it in
 * memory.  Use this for user uploads — avoids loading the full file into the
 * serverless function's heap.
 */
export async function streamObject(args: {
  bucket?: string;
  objectKey: string;
  contentType: string;
  body: ReadableStream<Uint8Array>;
  contentLength?: number;
}): Promise<void> {
  const nodeStream = Readable.fromWeb(
    args.body as unknown as import("stream/web").ReadableStream,
  );
  await getStorageClient().send(
    new PutObjectCommand({
      Bucket: args.bucket ?? getStorageBucketName(),
      Key: args.objectKey,
      ContentType: args.contentType,
      ContentLength: args.contentLength,
      Body: nodeStream,
    }),
  );
}

export async function createSignedDownloadUrl(args: {
  bucket: string;
  objectKey: string;
  filename?: string;
  download?: boolean;
  expiresInSeconds?: number;
}): Promise<string> {
  const contentDisposition =
    args.filename && args.download
      ? `attachment; filename="${sanitizeFilename(args.filename)}"`
      : undefined;

  return await getSignedUrl(
    getStorageClient(),
    new GetObjectCommand({
      Bucket: args.bucket,
      Key: args.objectKey,
      ResponseContentDisposition: contentDisposition,
    }),
    { expiresIn: args.expiresInSeconds ?? 60 * 15 },
  );
}

export async function deleteObject(args: {
  bucket?: string;
  objectKey: string;
}) {
  await getStorageClient().send(
    new DeleteObjectCommand({
      Bucket: args.bucket ?? getStorageBucketName(),
      Key: args.objectKey,
    }),
  );
}

export async function headObject(args: {
  bucket?: string;
  objectKey: string;
}): Promise<{ size: number; contentType: string; etag: string } | null> {
  try {
    const response = await getStorageClient().send(
      new HeadObjectCommand({
        Bucket: args.bucket ?? getStorageBucketName(),
        Key: args.objectKey,
      }),
    );

    return {
      size: response.ContentLength ?? 0,
      contentType: response.ContentType ?? "application/octet-stream",
      etag: response.ETag?.replace(/"/g, "") ?? "",
    };
  } catch {
    return null;
  }
}
