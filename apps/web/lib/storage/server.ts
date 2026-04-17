import {
  createObjectKey,
  createUploadTicket,
  getStorageBucketNameFromEnv,
  getStorageMaxUploadSizeFromEnv,
  getStorageProviderFromEnv,
  getStorageProviderNameFromEnv,
} from "@baseblocks/storage/node";

const storageProvider = getStorageProviderFromEnv();

export {
  createObjectKey,
  createUploadTicket,
  getStorageBucketNameFromEnv as getStorageBucketName,
  getStorageMaxUploadSizeFromEnv as getStorageMaxUploadSize,
  getStorageProviderNameFromEnv as getStorageProviderName,
};

export async function readObjectBytes(args: {
  bucket?: string;
  objectKey: string;
}) {
  return await storageProvider.readObjectBytes(args);
}

export async function streamObject(args: {
  bucket?: string;
  objectKey: string;
  contentType: string;
  body: ReadableStream<Uint8Array>;
  contentLength?: number;
}) {
  await storageProvider.streamObject(args);
}

export async function createSignedDownloadUrl(args: {
  bucket?: string;
  objectKey: string;
  filename?: string;
  download?: boolean;
  expiresInSeconds?: number;
}) {
  return await storageProvider.createSignedDownloadUrl(args);
}

export async function deleteObject(args: {
  bucket?: string;
  objectKey: string;
}) {
  await storageProvider.deleteObject(args);
}

export async function headObject(args: {
  bucket?: string;
  objectKey: string;
}) {
  return await storageProvider.headObject(args);
}
