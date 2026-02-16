"use client";

import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import "./subpage-block-editor.css";

import { BlockNoteView } from "@blocknote/mantine";
import { useCreateBlockNote } from "@blocknote/react";
import type { Block } from "@blocknote/core";
import { useTheme } from "next-themes";

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
  const { resolvedTheme } = useTheme();
  const blockNoteTheme = resolvedTheme === "dark" ? "dark" : "light";

  const editor = useCreateBlockNote({
    initialContent: initialContent && initialContent.length > 0
      ? initialContent
      : undefined,
  });

  return (
    <BlockNoteView
      editor={editor}
      editable={editable}
      theme={blockNoteTheme}
      onChange={() => {
        onChange?.(editor.document);
      }}
      data-subpage-editor
    />
  );
}
