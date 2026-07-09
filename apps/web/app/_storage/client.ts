"use client";

import {
  isSupportedUploadMimeType,
  resolveUploadMimeType,
  type UploadPurpose,
  createFileKey,
} from "@baseblocks/domain";
import type { SignedUpload } from "files-sdk";
import { createFilesClient } from "files-sdk/client";

const maxUploadSizeBytes = 100 * 1024 * 1024;

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

interface UploadResult {
  objectKey: string;
  size: number;
  contentType: string;
  checksum: string;
}

function sendSignedUpload(
  target: SignedUpload,
  file: File,
  onProgress?: (progress: UploadProgress) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(target.method, target.url, true);

    if (target.method === "PUT") {
      for (const [key, value] of Object.entries(target.headers ?? {})) {
        xhr.setRequestHeader(key, value);
      }
    }

    xhr.upload.addEventListener("progress", (event) => {
      const total = event.lengthComputable ? event.total : file.size;
      onProgress?.({
        loaded: event.loaded,
        total,
        percentage: total > 0 ? Math.round((event.loaded / total) * 100) : 0,
      });
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
        return;
      }
      reject(new Error(`Upload failed (${xhr.status})`));
    });
    xhr.addEventListener("error", () => reject(new Error("Upload failed")));
    xhr.addEventListener("abort", () => reject(new Error("Upload aborted")));

    if (target.method === "POST") {
      const form = new FormData();
      for (const [key, value] of Object.entries(target.fields)) {
        form.append(key, value);
      }
      form.append("file", file);
      xhr.send(form);
      return;
    }

    xhr.send(file);
  });
}

class BaseBlocksFilesClient {
  private readonly files = createFilesClient({ endpoint: "/api/files" });

  async upload(
    file: File,
    options: {
      siteId: string;
      purpose: UploadPurpose;
      onProgress?: (progress: UploadProgress) => void;
    },
  ): Promise<UploadResult> {
    const objectKey = createFileKey({
      siteId: options.siteId,
      purpose: options.purpose,
      fileId: crypto.randomUUID(),
      filename: file.name,
    });

    if (file.size > maxUploadSizeBytes) {
      throw new Error("File is too large");
    }

    const contentType = resolveUploadMimeType({
      filename: file.name,
      contentType: file.type,
    });

    if (!isSupportedUploadMimeType(contentType)) {
      throw new Error("File type not allowed");
    }

    const target = await this.files.signedUploadUrl(objectKey, {
      contentType,
      expiresIn: 60 * 10,
      maxSize: maxUploadSizeBytes,
      minSize: 0,
    });

    await sendSignedUpload(target, file, options.onProgress);

    const uploaded = await this.files.head(objectKey);

    options.onProgress?.({
      loaded: uploaded.size,
      total: uploaded.size,
      percentage: 100,
    });

    return {
      objectKey: uploaded.key,
      size: uploaded.size,
      contentType: uploaded.type || contentType,
      checksum: uploaded.etag ?? "",
    };
  }

  async cleanup(options: {
    siteId: string;
    purpose: UploadPurpose;
    objectKey: string;
  }): Promise<void> {
    await this.files.delete(options.objectKey).catch(() => undefined);
  }
}

export const filesClient = new BaseBlocksFilesClient();
