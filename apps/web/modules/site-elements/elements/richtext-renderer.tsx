"use client";

import "@blocknote/mantine/style.css";

import type { ElementRendererProps } from "@/modules/site-runtime/rendering";
import type { Block } from "@blocknote/core";
import { BlockNoteView } from "@blocknote/mantine";
import { useCreateBlockNote } from "@blocknote/react";
import { useTheme } from "next-themes";

export function RichTextRenderer({
  content,
}: ElementRendererProps<"richtext">) {
  const { resolvedTheme } = useTheme();
  const blockNoteTheme = resolvedTheme === "dark" ? "dark" : "light";

  const editor = useCreateBlockNote({
    initialContent:
      content.document && content.document.length > 0
        ? (content.document as Block[])
        : undefined,
  });

  return (
    <div className="[&_.bn-container]:!border-none [&_.bn-editor]:!px-0 [&_.bn-container]:!bg-transparent [&_.bn-editor]:!bg-transparent">
      <BlockNoteView editor={editor} editable={false} theme={blockNoteTheme} />
    </div>
  );
}
