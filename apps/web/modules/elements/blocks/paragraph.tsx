"use client";

import { cn } from "@/lib/utils";
import { useAutoSave } from "@/modules/elements/hooks/use-auto-save";
import { DEFAULT_BLOCK_CONTENT } from "@baseblocks/types/elements";
import { AlignLeft } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import ContentEditable from "react-contenteditable";
import type {
  ElementEditorProps,
  ElementPreviewProps,
  ElementRendererProps,
} from "../framework/registry";
import { registerElement } from "../framework/registry";

function ParagraphEditor({
  content,
  onUpdate,
  onSaveStatusChange,
}: ElementEditorProps<"paragraph">) {
  const [localText, setLocalText] = useState(content.text || "");
  const contentRef = useRef(content.text || "");
  const save = useAutoSave(onUpdate, onSaveStatusChange);

  useEffect(() => {
    setLocalText(content.text || "");
    contentRef.current = content.text || "";
  }, [content.text]);

  const handleChange = (e: { target: { value: string } }) => {
    const plainText = e.target.value
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]*>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">");
    setLocalText(plainText);
    contentRef.current = plainText.trim() ? plainText : "";
    onSaveStatusChange?.("pending");
    save({ ...content, text: plainText });
  };

  const isEmpty = !localText.trim();

  return (
    <div className="rounded-md px-2 py-2 transition-colors hover:bg-muted/50 relative">
      <ContentEditable
        html={contentRef.current}
        onChange={handleChange}
        className="w-full outline-none whitespace-pre-wrap"
      />
      {isEmpty && (
        <span className="absolute left-2 top-2 text-muted-foreground pointer-events-none">
          Start writing...
        </span>
      )}
    </div>
  );
}

function ParagraphRenderer({ content }: ElementRendererProps<"paragraph">) {
  return <p className="mb-4 leading-relaxed">{content.text}</p>;
}

function ParagraphPreview({ className }: ElementPreviewProps) {
  return (
    <div
      className={cn(
        "w-full h-full p-3 flex flex-col justify-center gap-1.5",
        className,
      )}
    >
      <div className="h-1.5 w-full bg-muted-foreground/30 rounded" />
      <div className="h-1.5 w-full bg-muted-foreground/30 rounded" />
      <div className="h-1.5 w-3/4 bg-muted-foreground/30 rounded" />
    </div>
  );
}

registerElement({
  type: "paragraph",
  category: "blocks",
  label: "Paragraph",
  description: "Plain text content",
  icon: AlignLeft,
  keywords: ["text", "body", "content", "write"],
  editor: ParagraphEditor,
  renderer: ParagraphRenderer,
  preview: ParagraphPreview,
  defaultContent: DEFAULT_BLOCK_CONTENT.paragraph,
});
