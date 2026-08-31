import type { OpenEditorImageRuntime } from "@openeditor/document";

export function createPublishedImageRuntime(
  imageIds: readonly string[],
): OpenEditorImageRuntime<File> {
  const releasedImageIds = new Set(imageIds);

  return {
    resolveImage: async (imageId, { signal } = {}) => {
      signal?.throwIfAborted();
      if (!releasedImageIds.has(imageId)) return null;
      return {
        imageId,
        src: `/api/files/${encodeURIComponent(imageId)}`,
        alt: "",
        width: null,
        height: null,
      };
    },
  };
}
