"use client";

import { api } from "@baseblocks/backend";
import type { Id } from "@baseblocks/backend";
import { useMutation } from "convex/react";
import { useState } from "react";
import { type UploadProgress, filesClient } from "@/app/_storage/client";

export interface UploadState {
  isUploading: boolean;
  progress: UploadProgress | null;
  error: string | null;
}

interface UploadOptions {
  siteId: Id<"sites">;
  libraryId?: Id<"documentLibraries">;
  folderId?: Id<"documentFolders">;
  onSuccess?: (documentId: Id<"documents">) => void;
  onError?: (error: Error) => void;
}

export function useFileUpload() {
  const [uploadStates, setUploadStates] = useState<Record<string, UploadState>>(
    {},
  );

  const createDocument = useMutation(api.documents.create);
  const createInLibrary = useMutation(api.documents.createInLibrary);

  const updateUploadState = (fileId: string, update: Partial<UploadState>) => {
    setUploadStates((prev) => ({
      ...prev,
      [fileId]: {
        ...(prev[fileId] || {
          isUploading: false,
          progress: null,
          error: null,
        }),
        ...update,
      },
    }));
  };

  const uploadFile = async (
    file: File,
    options: UploadOptions,
  ): Promise<Id<"documents"> | null> => {
    const fileId = `${file.name}-${Date.now()}`;
    let objectKey: string | null = null;

    try {
      updateUploadState(fileId, {
        isUploading: true,
        progress: null,
        error: null,
      });

      const uploadResult = await filesClient.upload(file, {
        siteId: options.siteId,
        purpose: "document",
        onProgress: (progress) => {
          updateUploadState(fileId, { progress });
        },
      });
      objectKey = uploadResult.objectKey;

      let documentId: Id<"documents">;
      if (options.libraryId) {
        documentId = await createInLibrary({
          siteId: options.siteId,
          libraryId: options.libraryId,
          folderId: options.folderId,
          objectKey: uploadResult.objectKey,
          filename: file.name,
          contentType: uploadResult.contentType,
          size: uploadResult.size,
          checksum: uploadResult.checksum,
        });
      } else {
        documentId = await createDocument({
          siteId: options.siteId,
          objectKey: uploadResult.objectKey,
          filename: file.name,
          contentType: uploadResult.contentType,
          size: uploadResult.size,
          checksum: uploadResult.checksum,
        });
      }

      updateUploadState(fileId, {
        isUploading: false,
        progress: { loaded: file.size, total: file.size, percentage: 100 },
      });
      options.onSuccess?.(documentId);

      return documentId;
    } catch (err) {
      if (objectKey) {
        await filesClient.cleanup({
          siteId: options.siteId,
          purpose: "document",
          objectKey,
        });
      }

      const error = err instanceof Error ? err : new Error("Upload failed");
      updateUploadState(fileId, { isUploading: false, error: error.message });
      options.onError?.(error);
      return null;
    }
  };

  const uploadFiles = async (
    files: File[],
    options: UploadOptions,
  ): Promise<(Id<"documents"> | null)[]> => {
    return await Promise.all(files.map((file) => uploadFile(file, options)));
  };

  const clearUploadState = (fileId: string) => {
    setUploadStates((prev) => {
      const next = { ...prev };
      delete next[fileId];
      return next;
    });
  };

  const clearAllUploadStates = () => {
    setUploadStates({});
  };

  const isAnyUploading = Object.values(uploadStates).some(
    (state) => state.isUploading,
  );

  const totalProgress = Object.values(uploadStates).reduce(
    (acc, state) => {
      if (state.progress) {
        acc.loaded += state.progress.loaded;
        acc.total += state.progress.total;
      }
      return acc;
    },
    { loaded: 0, total: 0 },
  );

  return {
    uploadFile,
    uploadFiles,
    uploadStates,
    isAnyUploading,
    totalProgress:
      totalProgress.total > 0
        ? {
            ...totalProgress,
            percentage: Math.round(
              (totalProgress.loaded / totalProgress.total) * 100,
            ),
          }
        : null,
    clearUploadState,
    clearAllUploadStates,
  };
}
