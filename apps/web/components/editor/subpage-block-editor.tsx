"use client";

import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import "./subpage-block-editor.css";

import { BlockNoteView } from "@blocknote/mantine";
import { useCreateBlockNote } from "@blocknote/react";
import type { Block } from "@blocknote/core";

interface SubpageBlockEditorProps {
  initialContent?: Block[];
  onChange?: (blocks: Block[]) => void;
  editable?: boolean;
}

export function SubpageBlockEditor({
  initialContent,
  onChange,
  editable = true,
}: SubpageBlockEditorProps) {
  const editor = useCreateBlockNote({
    initialContent: initialContent && initialContent.length > 0
      ? initialContent
      : undefined,
  });

  return (
    <BlockNoteView
      editor={editor}
      editable={editable}
      onChange={() => {
        onChange?.(editor.document);
      }}
      data-subpage-editor
    />
  );
}
