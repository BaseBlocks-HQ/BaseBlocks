"use client";

import type { ElementEditorProps } from "@/modules/elements/framework/registry";
import { LibraryBlockEditor } from "@/modules/library";

export function LibraryEditor({
  content,
  onUpdate,
}: ElementEditorProps<"library">) {
  return (
    <LibraryBlockEditor
      libraryId={content.libraryId}
      allowDownloads={content.allowDownloads !== false}
      onLibraryChange={(libraryId) => onUpdate({ ...content, libraryId })}
    />
  );
}
