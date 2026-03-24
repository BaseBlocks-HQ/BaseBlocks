"use client";

import { api } from "@baseblocks/backend";
import type { Id } from "@baseblocks/backend";
import { useMutation } from "convex/react";
import { useState } from "react";
import { type UploadProgress, storageClient } from "./client";

interface ImageUploadState {
  isUploading: boolean;
  progress: UploadProgress | null;
  error: string | null;
}

interface ImageUploadResult {
  url: string;
  width?: number;
  height?: number;
}

/**
 * Hook for uploading images directly to storage without creating document records.
 * Use this for images embedded in elements (like the image element).
 * For document library files, use useFileUpload instead.
 *
 */
export function useImageUpload() {
  const createSiteAsset = useMutation(api.assets.mutations.createSiteAsset);
  const [uploadState, setUploadState] = useState<ImageUploadState>({
    isUploading: false,
    progress: null,
    error: null,
  });

  const uploadImage = async (
    file: File,
    siteId: Id<"sites">,
  ): Promise<ImageUploadResult | null> => {
    let objectKey: string | null = null;

    // Validate it's an image
    if (!file.type.startsWith("image/")) {
      setUploadState({
        isUploading: false,
        progress: null,
        error: "File must be an image",
      });
      return null;
    }

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

      // Server-verify the upload before writing to Convex
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

      // Get image dimensions
      const dimensions = await getImageDimensions(url);

      return {
        url,
        ...dimensions,
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
    uploadImage,
    uploadState,
    clearError,
  };
}

/**
 * Get image dimensions from a URL
 */
function getImageDimensions(
  url: string,
): Promise<{ width: number; height: number } | Record<string, never>> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      resolve({});
    };
    img.src = url;
  });
}
