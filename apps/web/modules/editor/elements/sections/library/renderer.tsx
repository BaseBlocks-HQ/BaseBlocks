"use client";

import type { ElementRendererProps } from "@/modules/editor/elements/framework/registry";
import { PublicLibraryRenderer } from "@/modules/dashboard/library/components/public-library-renderer";

export function LibraryRenderer({ content }: ElementRendererProps<"library">) {
  return (
    <PublicLibraryRenderer
      libraryId={content.libraryId}
      allowDownloads={content.allowDownloads !== false}
    />
  );
}
