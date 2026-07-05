"use client";

import type { UploadPurpose } from "@baseblocks/types";
import { createFilesClient } from "files-sdk/client";
import { createFileKey } from "./keys";

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
      filename: file.name,
    });

    const uploaded = await this.files.upload(objectKey, file, {
      contentType: file.type || "application/octet-stream",
      onProgress: (progress) => {
        const total = progress.total || file.size;
        options.onProgress?.({
          loaded: progress.loaded,
          total,
          percentage: total > 0 ? Math.round((progress.loaded / total) * 100) : 0,
        });
      },
    });

    return {
      objectKey: uploaded.key,
      size: uploaded.size,
      contentType: uploaded.type || file.type || "application/octet-stream",
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
