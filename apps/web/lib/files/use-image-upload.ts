"use client";

import { api, type Id } from "@baseblocks/backend";
import { useMutation } from "convex/react";
import { useState } from "react";
import {
  fileRegistration,
  type UploadProgress,
  filesClient,
} from "@/lib/files/upload";

export interface SiteAssetUploadState {
  isUploading: boolean;
  progress: UploadProgress | null;
  error: string | null;
}

interface ImageUploadResult {
  fileId: Id<"files">;
  url: string;
  width?: number;
  height?: number;
}

export function useImageUpload() {
  const createSiteAsset = useMutation(api.files.createSiteAsset);
  const [uploadState, setUploadState] = useState<SiteAssetUploadState>({
    isUploading: false,
    progress: null,
    error: null,
  });

  const uploadImage = async (
    file: File,
    siteId: Id<"sites">,
  ): Promise<ImageUploadResult | null> => {
    if (!file.type.startsWith("image/")) return null;

    setUploadState({ isUploading: true, progress: null, error: null });

    try {
      const { registered } = await filesClient.uploadAndRegister(
        file,
        {
          siteId,
          purpose: "siteAsset",
          onProgress: (progress) => {
            setUploadState((current) => ({ ...current, progress }));
          },
        },
        (upload) =>
          createSiteAsset({ siteId, ...fileRegistration(file, upload) }),
      );
      setUploadState({
        isUploading: false,
        progress: { loaded: file.size, total: file.size, percentage: 100 },
        error: null,
      });

      return {
        fileId: registered.fileId,
        url: registered.url,
        ...(await getImageDimensions(registered.url)),
      };
    } catch (error) {
      const failure =
        error instanceof Error ? error : new Error("Upload failed");
      setUploadState({
        isUploading: false,
        progress: null,
        error: failure.message,
      });
      return null;
    }
  };

  const clearError = () => {
    setUploadState((current) => ({ ...current, error: null }));
  };

  return { uploadImage, uploadState, clearError };
}

function getImageDimensions(
  url: string,
): Promise<{ width: number; height: number } | Record<string, never>> {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => {
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
    };
    image.onerror = () => {
      resolve({});
    };
    image.src = url;
  });
}
