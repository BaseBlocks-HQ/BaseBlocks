"use client";

import type { Id } from "@repo/backend";
import { useCallback, useState } from "react";
import { authClient } from "../auth-client";
import { type UploadProgress, entityStorageClient } from "./client";

export interface ImageUploadState {
  isUploading: boolean;
  progress: UploadProgress | null;
  error: string | null;
}

export interface ImageUploadResult {
  url: string;
  width?: number;
  height?: number;
}

/**
 * Hook for uploading images directly to storage without creating document records.
 * Use this for images embedded in elements (like the image element).
 * For document library files, use useFileUpload instead.
 *
 * NOTE: Entity Storage upload requires a migration to a new storage backend.
 * Token handling will be updated as part of the storage migration.
 */
export function useImageUpload() {
  const { data: session } = authClient.useSession();
  const user = session?.user;
  const [uploadState, setUploadState] = useState<ImageUploadState>({
    isUploading: false,
    progress: null,
    error: null,
  });

  const uploadImage = useCallback(
    async (
      file: File,
      siteId: Id<"sites">,
    ): Promise<ImageUploadResult | null> => {
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

        if (!user?.id) {
          throw new Error("User not found");
        }

        // Generate storage path for images
        const path = entityStorageClient.generatePath(siteId, user.id, file.name);

        // Upload to Entity Storage (proxy handles auth via session cookie)
        const { cdnUrl } = await entityStorageClient.upload(
          file,
          path,
          (progress) => {
            setUploadState((prev) => ({ ...prev, progress }));
          },
        );

        setUploadState({
          isUploading: false,
          progress: { loaded: file.size, total: file.size, percentage: 100 },
          error: null,
        });

        // Get image dimensions
        const dimensions = await getImageDimensions(cdnUrl);

        return {
          url: cdnUrl,
          ...dimensions,
        };
      } catch (err) {
        const error = err instanceof Error ? err.message : "Upload failed";
        setUploadState({
          isUploading: false,
          progress: null,
          error,
        });
        return null;
      }
    },
    [user],
  );

  const clearError = useCallback(() => {
    setUploadState((prev) => ({ ...prev, error: null }));
  }, []);

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
