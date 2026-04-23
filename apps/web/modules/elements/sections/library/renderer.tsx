"use client";

import type { ElementRendererProps } from "@/modules/elements/framework/registry";
import { PublicLibraryRenderer } from "@/modules/library/components/public-library-renderer";

export function LibraryRenderer({ content }: ElementRendererProps<"library">) {
  return (
    <PublicLibraryRenderer
      libraryId={content.libraryId}
      allowDownloads={content.allowDownloads !== false}
    />
  );
}
