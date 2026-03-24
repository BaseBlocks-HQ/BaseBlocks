"use client";

import { api } from "@baseblocks/backend";
import type { Id } from "@baseblocks/backend";
import { useAction, useMutation } from "convex/react";
import { useState } from "react";
import { type UploadProgress, storageClient } from "./client";
import { isExtractable } from "./extraction";

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

/**
 * Hook for uploading files to Library
 *
 */
export function useFileUpload() {
  const [uploadStates, setUploadStates] = useState<Record<string, UploadState>>(
    {},
  );

  const createDocument = useMutation(api.documents.mutations.create);
  const createInLibrary = useMutation(api.documents.mutations.createInLibrary);
  const triggerExtraction = useAction(
    api.actions?.extractDocument?.triggerExtraction,
  );

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

      const uploadResult = await storageClient.upload(file, {
        siteId: options.siteId,
        purpose: "document",
        onProgress: (progress) => {
          updateUploadState(fileId, { progress });
        },
      });
      objectKey = uploadResult.objectKey;

      // Server-verify the upload before writing to Convex
      const verified = await storageClient.finalize({
        siteId: options.siteId,
        purpose: "document",
        objectKey,
      });

      // Create document record in Convex with server-verified metadata
      let documentId: Id<"documents">;

      if (options.libraryId) {
        documentId = await createInLibrary({
          siteId: options.siteId,
          libraryId: options.libraryId,
          folderId: options.folderId,
          objectKey: verified.objectKey,
          filename: file.name,
          contentType: verified.contentType,
          size: verified.size,
          checksum: verified.checksum,
        });
      } else {
        documentId = await createDocument({
          siteId: options.siteId,
          objectKey: verified.objectKey,
          filename: file.name,
          contentType: verified.contentType,
          size: verified.size,
          checksum: verified.checksum,
        });
      }

      updateUploadState(fileId, {
        isUploading: false,
        progress: { loaded: file.size, total: file.size, percentage: 100 },
      });
      options.onSuccess?.(documentId);

      // Trigger text extraction for supported file types (non-blocking)
      const contentType = file.type || "application/octet-stream";
      if (isExtractable(contentType) && triggerExtraction) {
        triggerExtraction({ documentId }).catch((_err: unknown) => {});
      }

      return documentId;
    } catch (err) {
      if (objectKey) {
        await storageClient.cleanup({
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
    const results = await Promise.all(
      files.map((file) => uploadFile(file, options)),
    );
    return results;
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

  // Check if any files are uploading
  const isAnyUploading = Object.values(uploadStates).some(
    (state) => state.isUploading,
  );

  // Get total progress across all uploads
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
