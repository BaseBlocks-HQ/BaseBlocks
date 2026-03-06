"use client";

import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";

import { cn } from "@/lib/utils";
import { useAutoSave } from "@/modules/elements/hooks/use-auto-save";
import { DEFAULT_BLOCK_CONTENT } from "@baseblocks/types/elements";
import type { Block } from "@blocknote/core";
import { BlockNoteView } from "@blocknote/mantine";
import { useCreateBlockNote } from "@blocknote/react";
import { TextCursorInput } from "lucide-react";
import { useTheme } from "next-themes";
import { useState } from "react";
import type {
  ElementEditorProps,
  ElementPreviewProps,
  ElementRendererProps,
} from "../framework/registry";
import { registerElement } from "../framework/registry";

function RichTextEditor({
  content,
  onUpdate,
  onSaveStatusChange,
}: ElementEditorProps<"richtext">) {
  const { resolvedTheme } = useTheme();
  const blockNoteTheme = resolvedTheme === "dark" ? "dark" : "light";
  const [initialContent] = useState(() =>
    content.document && content.document.length > 0
      ? (content.document as Block[])
      : undefined,
  );
  const save = useAutoSave(onUpdate, onSaveStatusChange);

  const editor = useCreateBlockNote({
    initialContent,
  });

  return (
    <div className="rounded-md transition-colors hover:bg-muted/50 [&_.bn-container]:!border-none [&_.bn-editor]:!pr-0 [&_.bn-editor]:!pl-12 [&_.bn-container]:!bg-transparent [&_.bn-editor]:!bg-transparent">
      <BlockNoteView
        editor={editor}
        theme={blockNoteTheme}
        onChange={() => {
          onSaveStatusChange?.("pending");
          save({ ...content, document: editor.document });
        }}
      />
    </div>
  );
}

function RichTextRenderer({ content }: ElementRendererProps<"richtext">) {
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

function RichTextPreview({ className }: ElementPreviewProps) {
  return (
    <div
      className={cn(
        "w-full h-full p-3 flex flex-col justify-center gap-1.5",
        className,
      )}
    >
      <div className="h-2 w-1/3 bg-muted-foreground/40 rounded font-bold" />
      <div className="h-1.5 w-full bg-muted-foreground/30 rounded" />
      <div className="h-1.5 w-full bg-muted-foreground/30 rounded" />
      <div className="h-1.5 w-2/3 bg-primary/30 rounded" />
    </div>
  );
}

registerElement({
  type: "richtext",
  category: "blocks",
  label: "Rich Text",
  description: "Rich text editor with formatting, lists, and more",
  icon: TextCursorInput,
  keywords: [
    "text",
    "rich",
    "editor",
    "blocknote",
    "write",
    "format",
    "wysiwyg",
  ],
  editor: RichTextEditor,
  renderer: RichTextRenderer,
  preview: RichTextPreview,
  defaultContent: DEFAULT_BLOCK_CONTENT.richtext,
});
