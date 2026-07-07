"use client";

import type { ElementEditorProps } from "@/modules/editor/elements/framework/registry";
import { LibraryBlockEditor } from "@/modules/dashboard/library";

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
