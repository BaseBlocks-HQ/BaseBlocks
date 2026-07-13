"use client";

import { api } from "@baseblocks/backend";
import type { Id } from "@baseblocks/backend";
import { useMutation } from "convex/react";
import { useState } from "react";
import { type UploadProgress, filesClient } from "@/lib/files/upload";

export interface SiteAssetUploadState {
  isUploading: boolean;
  progress: UploadProgress | null;
  error: string | null;
}

export interface SiteAssetUploadResult {
  fileId: Id<"files">;
  url: string;
  contentType: string;
}

export function useSiteAssetUpload() {
  const createSiteAsset = useMutation(api.files.createSiteAsset);
  const [uploadState, setUploadState] = useState<SiteAssetUploadState>({
    isUploading: false,
    progress: null,
    error: null,
  });

  const uploadSiteAsset = async (
    file: File,
    siteId: Id<"sites">,
  ): Promise<SiteAssetUploadResult | null> => {
    let objectKey: string | null = null;

    try {
      setUploadState({
        isUploading: true,
        progress: null,
        error: null,
      });

      const uploadResult = await filesClient.upload(file, {
        siteId,
        purpose: "siteAsset",
        onProgress: (progress) => {
          setUploadState((prev) => ({ ...prev, progress }));
        },
      });
      objectKey = uploadResult.objectKey;

      const { fileId, url } = await createSiteAsset({
        siteId,
        objectKey: uploadResult.objectKey,
        filename: file.name,
        contentType: uploadResult.contentType,
        size: uploadResult.size,
        checksum: uploadResult.checksum,
      });

      setUploadState({
        isUploading: false,
        progress: { loaded: file.size, total: file.size, percentage: 100 },
        error: null,
      });

      return {
        fileId,
        url,
        contentType: uploadResult.contentType,
      };
    } catch (err) {
      let failure = err instanceof Error ? err : new Error("Upload failed");
      if (objectKey) {
        try {
          await filesClient.cleanup({
            siteId,
            purpose: "siteAsset",
            objectKey,
          });
        } catch (cleanupError) {
          failure = new AggregateError(
            [failure, cleanupError],
            "Upload failed and the uploaded object could not be cleaned up",
          );
        }
      }

      setUploadState({
        isUploading: false,
        progress: null,
        error: failure.message,
      });
      return null;
    }
  };

  const clearError = () => {
    setUploadState((prev) => ({ ...prev, error: null }));
  };

  return {
    uploadSiteAsset,
    uploadState,
    clearError,
  };
}
