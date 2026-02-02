"use client";

import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import "./public-subpage-block-viewer.css";

import { BlockNoteView } from "@blocknote/mantine";
import { useCreateBlockNote } from "@blocknote/react";
import type { Block } from "@blocknote/core";

interface PublicSubpageBlockViewerProps {
  content?: Block[];
}

export function PublicSubpageBlockViewer({ content }: PublicSubpageBlockViewerProps) {
  const editor = useCreateBlockNote({
    initialContent: content && content.length > 0 ? content : undefined,
  });

  if (!content || content.length === 0) {
    return <p className="text-muted-foreground text-sm">No content.</p>;
  }

  return (
    <BlockNoteView
      editor={editor}
      editable={false}
      data-public-viewer
    />
  );
}
