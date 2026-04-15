"use client";

import { api } from "@baseblocks/backend";
import type { Id } from "@baseblocks/backend";
import { useMutation } from "convex/react";
import { useState } from "react";
import { type UploadProgress, storageClient } from "./client";

export interface SiteAssetUploadState {
  isUploading: boolean;
  progress: UploadProgress | null;
  error: string | null;
}

export interface SiteAssetUploadResult {
  url: string;
  contentType: string;
}

export function useSiteAssetUpload() {
  const createSiteAsset = useMutation(api.assets.mutations.createSiteAsset);
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

      const uploadResult = await storageClient.upload(file, {
        siteId,
        purpose: "siteAsset",
        onProgress: (progress) => {
          setUploadState((prev) => ({ ...prev, progress }));
        },
      });
      objectKey = uploadResult.objectKey;

      const verified = await storageClient.finalize({
        siteId,
        purpose: "siteAsset",
        objectKey,
      });

      const { url } = await createSiteAsset({
        siteId,
        objectKey: verified.objectKey,
        filename: file.name,
        contentType: verified.contentType,
        size: verified.size,
        checksum: verified.checksum,
      });

      setUploadState({
        isUploading: false,
        progress: { loaded: file.size, total: file.size, percentage: 100 },
        error: null,
      });

      return {
        url,
        contentType: verified.contentType,
      };
    } catch (err) {
      if (objectKey) {
        await storageClient.cleanup({
          siteId,
          purpose: "siteAsset",
          objectKey,
        });
      }

      const error = err instanceof Error ? err.message : "Upload failed";
      setUploadState({
        isUploading: false,
        progress: null,
        error,
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
