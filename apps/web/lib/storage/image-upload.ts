"use client";

import type { Id } from "@baseblocks/backend";
import { useSiteAssetUpload } from "./site-asset-upload";

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
  const { uploadSiteAsset, uploadState, clearError } = useSiteAssetUpload();

  const uploadImage = async (
    file: File,
    siteId: Id<"sites">,
  ): Promise<ImageUploadResult | null> => {
    // Validate it's an image
    if (!file.type.startsWith("image/")) {
      return null;
    }

    const asset = await uploadSiteAsset(file, siteId);
    if (!asset) {
      return null;
    }

    const dimensions = await getImageDimensions(asset.url);

    return {
      url: asset.url,
      ...dimensions,
    };
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
