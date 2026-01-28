"use client";

import { useState, useCallback } from "react";
import { useMutation, useAction } from "convex/react";
import { api } from "@repo/backend";
import type { Id } from "@repo/backend";
import { entityStorageClient, type UploadProgress } from "./client";
import { useEntityAuth } from "../auth";
import { isExtractable } from "./extraction";

export interface UploadState {
  isUploading: boolean;
  progress: UploadProgress | null;
  error: string | null;
}

export interface UploadOptions {
  siteId: Id<"sites">;
  libraryId?: Id<"documentLibraries">;
  folderId?: Id<"documentFolders">;
  onSuccess?: (documentId: Id<"documents">) => void;
  onError?: (error: Error) => void;
}

/**
 * Hook for uploading files to document library
 */
export function useFileUpload() {
  const { getToken, user } = useEntityAuth();
  const [uploadStates, setUploadStates] = useState<Record<string, UploadState>>({});

  const createDocument = useMutation(api.documents.mutations.create);
  const createInLibrary = useMutation(api.documents.mutations.createInLibrary);
  const triggerExtraction = useAction(api.actions?.extractDocument?.triggerExtraction);

  const updateUploadState = useCallback(
    (fileId: string, update: Partial<UploadState>) => {
      setUploadStates((prev) => ({
        ...prev,
        [fileId]: {
          ...(prev[fileId] || { isUploading: false, progress: null, error: null }),
          ...update,
        },
      }));
    },
    [],
  );

  const uploadFile = useCallback(
    async (file: File, options: UploadOptions): Promise<Id<"documents"> | null> => {
      const fileId = `${file.name}-${Date.now()}`;

      try {
        updateUploadState(fileId, { isUploading: true, progress: null, error: null });

        // Get auth token
        const token = await getToken();
        if (!token) {
          throw new Error("Not authenticated");
        }

        if (!user?.id) {
          throw new Error("User not found");
        }

        // Generate storage path
        const path = entityStorageClient.generatePath(
          options.siteId,
          user.id,
          file.name,
        );

        // Upload to Entity Storage
        const { blobId, cdnUrl } = await entityStorageClient.upload(
          file,
          path,
          token,
          (progress) => {
            updateUploadState(fileId, { progress });
          },
        );

        // Create document record in Convex
        let documentId: Id<"documents">;

        if (options.libraryId) {
          documentId = await createInLibrary({
            siteId: options.siteId,
            libraryId: options.libraryId,
            folderId: options.folderId,
            blobId,
            cdnUrl,
            filename: file.name,
            contentType: file.type || "application/octet-stream",
            size: file.size,
          });
        } else {
          documentId = await createDocument({
            siteId: options.siteId,
            blobId,
            cdnUrl,
            filename: file.name,
            contentType: file.type || "application/octet-stream",
            size: file.size,
          });
        }

        updateUploadState(fileId, { isUploading: false, progress: { loaded: file.size, total: file.size, percentage: 100 } });
        options.onSuccess?.(documentId);

        // Trigger text extraction for supported file types (non-blocking)
        const contentType = file.type || "application/octet-stream";
        if (isExtractable(contentType) && triggerExtraction) {
          // Fire and forget - extraction happens in background
          triggerExtraction({ documentId, authToken: token }).catch((err: unknown) => {
            console.warn("Failed to trigger extraction:", err);
          });
        }

        return documentId;
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Upload failed");
        updateUploadState(fileId, { isUploading: false, error: error.message });
        options.onError?.(error);
        return null;
      }
    },
    [getToken, user, createDocument, createInLibrary, triggerExtraction, updateUploadState],
  );

  const uploadFiles = useCallback(
    async (files: File[], options: UploadOptions): Promise<(Id<"documents"> | null)[]> => {
      const results = await Promise.all(
        files.map((file) => uploadFile(file, options)),
      );
      return results;
    },
    [uploadFile],
  );

  const clearUploadState = useCallback((fileId: string) => {
    setUploadStates((prev) => {
      const next = { ...prev };
      delete next[fileId];
      return next;
    });
  }, []);

  const clearAllUploadStates = useCallback(() => {
    setUploadStates({});
  }, []);

  // Check if any files are uploading
  const isAnyUploading = Object.values(uploadStates).some((state) => state.isUploading);

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
    totalProgress: totalProgress.total > 0
      ? {
          ...totalProgress,
          percentage: Math.round((totalProgress.loaded / totalProgress.total) * 100),
        }
      : null,
    clearUploadState,
    clearAllUploadStates,
  };
}
