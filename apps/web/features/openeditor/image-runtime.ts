"use client";

import { fileRegistration, filesClient } from "@/lib/files/upload";
import { api, type Id } from "@baseblocks/backend";
import {
  isSupportedUploadMimeType,
  resolveUploadMimeType,
} from "@baseblocks/domain";
import type {
  OpenEditorImageRuntime,
  OpenEditorImageUploadInput,
} from "@openeditor/core";
import { useMutation } from "convex/react";

const selectBrowserImage = (signal?: AbortSignal) =>
  new Promise<OpenEditorImageUploadInput<File> | null>((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.hidden = true;
    document.body.append(input);

    let settled = false;
    const finish = (value: OpenEditorImageUploadInput<File> | null) => {
      if (settled) return;
      settled = true;
      input.remove();
      resolve(value);
    };
    const cancel = () => {
      if (settled) return;
      settled = true;
      input.remove();
      reject(new DOMException("Selection cancelled", "AbortError"));
    };

    signal?.addEventListener("abort", cancel, { once: true });
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
  });

export function useBaseBlocksImageRuntime(
  siteId: Id<"sites">,
): OpenEditorImageRuntime<File> {
  const createSiteAsset = useMutation(api.files.createSiteAsset);

  return {
    selectImage: ({ signal } = {}) => selectBrowserImage(signal),
    validateImage: (input) => {
      const contentType = resolveUploadMimeType({
        filename: input.name,
        contentType: input.mimeType ?? "",
      });
      return contentType.startsWith("image/") &&
        isSupportedUploadMimeType(contentType)
        ? { accepted: true }
        : { accepted: false, message: "Choose a supported image file." };
    },
    uploadImage: async (input, callbacks) => {
      const { registered } = await filesClient.uploadAndRegister(
        input.source,
        {
          siteId,
          purpose: "siteAsset",
          signal: callbacks?.signal,
          onProgress: (progress) =>
            callbacks?.onProgress?.(progress.percentage / 100),
        },
        (upload) => {
          if (callbacks?.signal?.aborted) {
            throw new DOMException("Upload cancelled", "AbortError");
          }
          return createSiteAsset({
            siteId,
            ...fileRegistration(input.source, upload),
          });
        },
      );

      return {
        imageId: registered.fileId,
        src: registered.url,
        alt: "",
        width: null,
        height: null,
      };
    },
  } satisfies OpenEditorImageRuntime<File>;
}
