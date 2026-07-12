"use client";

import { filesClient } from "@/lib/files/upload";
import { api, type Id } from "@baseblocks/backend";
import {
  isSupportedUploadMimeType,
  resolveUploadMimeType,
} from "@baseblocks/domain";
import type {
  OpenEditorAttachmentRuntime,
  OpenEditorAttachmentSnapshot,
  OpenEditorAttachmentUploadInput,
} from "@openeditor/core";
import { useConvex, useMutation } from "convex/react";
import { useMemo } from "react";

const MAX_ATTACHMENT_SIZE = 50 * 1024 * 1024;

const snapshot = (document: {
  _id: string;
  filename: string;
  contentType: string;
  size: number;
}): OpenEditorAttachmentSnapshot => ({
  attachmentId: document._id,
  name: document.filename,
  mimeType: document.contentType,
  size: document.size,
  url: `/api/files/${document._id}`,
});

const selectBrowserFile = (signal?: AbortSignal) =>
  new Promise<OpenEditorAttachmentUploadInput<File> | null>(
    (resolve, reject) => {
      const input = document.createElement("input");
      input.type = "file";
      input.hidden = true;
      document.body.append(input);
      let settled = false;
      const finish = (value: OpenEditorAttachmentUploadInput<File> | null) => {
        if (settled) return;
        settled = true;
        input.remove();
        resolve(value);
      };
      signal?.addEventListener(
        "abort",
        () => {
          input.remove();
          reject(new DOMException("Selection cancelled", "AbortError"));
        },
        { once: true },
      );
      input.addEventListener(
        "change",
        () => {
          const file = input.files?.[0];
          finish(
            file
              ? {
                  name: file.name,
                  mimeType: file.type || null,
                  size: file.size,
                  source: file,
                }
              : null,
          );
        },
        { once: true },
      );
      window.addEventListener(
        "focus",
        () =>
          window.setTimeout(() => {
            if (!input.files?.length) finish(null);
          }, 300),
        { once: true },
      );
      input.click();
    },
  );

export function useBaseBlocksAttachmentRuntime(
  siteId: Id<"sites">,
): OpenEditorAttachmentRuntime<File> {
  const convex = useConvex();
  const createDocument = useMutation(api.documents.create);
  const renameDocument = useMutation(api.documents.rename);

  return useMemo(() => {
    const upload = async (
      input: OpenEditorAttachmentUploadInput<File>,
      callbacks?: {
        onProgress?: (progress: number) => void;
        signal?: AbortSignal;
      },
    ) => {
      let objectKey: string | null = null;
      try {
        const uploaded = await filesClient.upload(input.source, {
          siteId,
          purpose: "document",
          signal: callbacks?.signal,
          onProgress: (progress) =>
            callbacks?.onProgress?.(progress.percentage / 100),
        });
        objectKey = uploaded.objectKey;
        if (callbacks?.signal?.aborted) {
          throw new DOMException("Upload cancelled", "AbortError");
        }
        const documentId = await createDocument({
          siteId,
          objectKey: uploaded.objectKey,
          filename: input.name,
          contentType: uploaded.contentType,
          size: uploaded.size,
          checksum: uploaded.checksum,
        });
        return {
          attachmentId: documentId,
          name: input.name,
          mimeType: uploaded.contentType,
          size: uploaded.size,
          url: `/api/files/${documentId}`,
        } satisfies OpenEditorAttachmentSnapshot;
      } catch (error) {
        if (objectKey) {
          await filesClient
            .cleanup({ siteId, purpose: "document", objectKey })
            .catch(() => undefined);
        }
        throw error;
      }
    };

    return {
      selectAttachment: ({ signal } = {}) => selectBrowserFile(signal),
      validateAttachment: (input) => {
        if (input.size !== null && input.size > MAX_ATTACHMENT_SIZE) {
          return {
            accepted: false,
            message: "Files must be 50 MB or smaller.",
          };
        }
        const contentType = resolveUploadMimeType({
          filename: input.name,
          contentType: input.mimeType ?? "",
        });
        return isSupportedUploadMimeType(contentType)
          ? { accepted: true }
          : { accepted: false, message: "This file type is not allowed." };
      },
      uploadAttachment: upload,
      replaceAttachment: async (_attachmentId, input, callbacks) =>
        upload(input, callbacks),
      resolveAttachment: async (attachmentId) => {
        const resolved = await convex.query(api.documents.get, {
          documentId: attachmentId as Id<"documents">,
        });
        return resolved ? snapshot(resolved) : null;
      },
      renameAttachment: async (attachmentId, name) => {
        await renameDocument({
          documentId: attachmentId as Id<"documents">,
          filename: name,
        });
      },
      openAttachment: (attachment) => {
        const url = attachment.attachmentId
          ? `/api/files/${attachment.attachmentId}`
          : attachment.url;
        if (url) window.open(url, "_blank", "noopener,noreferrer");
      },
    } satisfies OpenEditorAttachmentRuntime<File>;
  }, [convex, createDocument, renameDocument, siteId]);
}
