"use client";

import type { ElementEditorProps } from "@/components/elements/registry";
import { useDebounceCallback } from "@/hooks";
import ContentEditable from "react-contenteditable";
import { useCallback, useEffect, useRef, useState } from "react";

export function ParagraphEditor({
  id,
  content,
  isSelected,
  onUpdate,
  onSaveStatusChange,
}: ElementEditorProps<"paragraph">) {
  const [localText, setLocalText] = useState(content.text || "");
  const contentRef = useRef(content.text || "");

  const debouncedSave = useDebounceCallback(
    useCallback(
      async (text: string) => {
        onSaveStatusChange?.("saving");
        try {
          await onUpdate({ ...content, text });
          onSaveStatusChange?.("saved");
        } catch (error) {
          console.error("Failed to save:", error);
          onSaveStatusChange?.("idle");
        }
      },
      [onUpdate, content, onSaveStatusChange],
    ),
    500,
  );

  // Sync content when id changes
  useEffect(() => {
    setLocalText(content.text || "");
    contentRef.current = content.text || "";
  }, [id, content.text]);

  const handleChange = (e: { target: { value: string } }) => {
    // Strip HTML tags for plain text, preserve line breaks
    const plainText = e.target.value
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]*>/g, "");
    setLocalText(plainText);
    // Clear ref completely when empty so :empty CSS works
    contentRef.current = plainText.trim() ? plainText : "";
    onSaveStatusChange?.("pending");
    debouncedSave(plainText);
  };

  const isEmpty = !localText.trim();

  return (
    <div className="rounded-md px-2 py-2 transition-colors hover:bg-muted/50 relative">
      <ContentEditable
        html={contentRef.current}
        onChange={handleChange}
        className="w-full outline-none whitespace-pre-wrap relative z-10"
      />
      {isEmpty && (
        <span className="absolute left-2 top-2 text-muted-foreground pointer-events-none">
          Start writing...
        </span>
      )}
    </div>
  );
}
