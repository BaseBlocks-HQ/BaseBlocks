"use client";

import { fileRegistration, filesClient } from "@/lib/files/upload";
import { api, type Id } from "@baseblocks/backend";
import {
  isSupportedUploadMimeType,
  resolveUploadMimeType,
} from "@baseblocks/domain";
import type {
  OpenEditorImageRuntime,
  OpenEditorImageSnapshot,
  OpenEditorImageUploadInput,
} from "@openeditor/core";
import { useConvex, useMutation } from "convex/react";
import { useMemo } from "react";

type ResolvedSiteImageAsset = {
  imageId: string;
  url: string;
};

export function createBaseBlocksImageResolver(
  resolveSiteAsset: (imageId: string) => Promise<ResolvedSiteImageAsset | null>,
) {
  return async (
    imageId: string,
    options: { signal?: AbortSignal } = {},
  ): Promise<OpenEditorImageSnapshot | null> => {
    options.signal?.throwIfAborted();
    const resolved = await resolveSiteAsset(imageId);
    options.signal?.throwIfAborted();
    return resolved
      ? {
          imageId: resolved.imageId,
          src: resolved.url,
          alt: "",
          width: null,
          height: null,
        }
      : null;
  };
}

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
  const convex = useConvex();
  const createSiteAsset = useMutation(api.files.createSiteAsset);
  const resolveImage = useMemo(
    () =>
      createBaseBlocksImageResolver((imageId) =>
        convex.query(api.files.resolveSiteAsset, { siteId, fileId: imageId }),
      ),
    [convex, siteId],
  );

  return useMemo(
    () =>
      ({
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
        resolveImage,
      }) satisfies OpenEditorImageRuntime<File>,
    [createSiteAsset, resolveImage, siteId],
  );
}
