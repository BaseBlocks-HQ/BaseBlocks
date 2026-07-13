"use client";

import {
  isSupportedUploadMimeType,
  resolveUploadMimeType,
  toFilesKind,
  type UploadPurpose,
} from "@baseblocks/domain";
import { createFilesClient, type FilesClient } from "files-sdk/client";

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface UploadResult {
  objectKey: string;
  size: number;
  contentType: string;
  checksum?: string;
}

export interface FileRegistration extends UploadResult {
  filename: string;
}

interface UploadOptions {
  siteId: string;
  purpose: UploadPurpose;
  onProgress?: (progress: UploadProgress) => void;
  signal?: AbortSignal;
}

interface UploadSession {
  client: Pick<FilesClient, "upload" | "delete">;
  file: File;
  keyPrefix: string;
}

type CreateUploadSession = (
  file: File,
  options: UploadOptions,
) => UploadSession;

export function fileRegistration(
  file: File,
  uploaded: UploadResult,
): FileRegistration {
  return { ...uploaded, filename: file.name };
}

function defaultUploadSession(
  file: File,
  options: UploadOptions,
): UploadSession {
  const contentType = resolveUploadMimeType({
    filename: file.name,
    contentType: file.type,
  });
  if (!isSupportedUploadMimeType(contentType)) {
    throw new Error("File type not allowed");
  }

  const fileId = crypto.randomUUID();
  return {
    client: createFilesClient({
      headers: {
        "x-baseblocks-site-id": options.siteId,
        "x-baseblocks-upload-purpose": options.purpose,
        "x-baseblocks-upload-file-id": fileId,
        "x-baseblocks-upload-filename": file.name,
        "x-baseblocks-upload-content-type": contentType,
      },
    }),
    file:
      file.type === contentType
        ? file
        : new File([file], file.name, {
            type: contentType,
            lastModified: file.lastModified,
          }),
    keyPrefix: `sites/${options.siteId}/${toFilesKind(options.purpose)}/${fileId}/`,
  };
}

async function cleanupAfterFailure(
  failure: unknown,
  cleanup: () => Promise<void>,
): Promise<never> {
  try {
    await cleanup();
  } catch (cleanupError) {
    throw new AggregateError(
      [failure, cleanupError],
      "Upload registration failed and the uploaded object could not be cleaned up",
    );
  }
  throw failure;
}

export function createUploadClient(
  createSession: CreateUploadSession = defaultUploadSession,
) {
  return {
    async uploadAndRegister<T>(
      file: File,
      options: UploadOptions,
      register: (uploaded: UploadResult) => Promise<T>,
    ): Promise<{ registered: T; uploaded: UploadResult }> {
      const session = createSession(file, options);
      const stored = await session.client.upload(session.file, {
        signal: options.signal,
        onProgress: ({ loaded, total }) => {
          options.onProgress?.({
            loaded,
            total,
            percentage: total > 0 ? Math.round((loaded / total) * 100) : 0,
          });
        },
      });
      const uploaded: UploadResult = {
        objectKey: `${session.keyPrefix}${stored.key}`,
        size: stored.size,
        contentType: stored.type,
        checksum: stored.etag,
      };

      try {
        return { registered: await register(uploaded), uploaded };
      } catch (registrationError) {
        return await cleanupAfterFailure(registrationError, () =>
          session.client.delete(stored.key),
        );
      }
    },
  };
}

export const filesClient = createUploadClient();
