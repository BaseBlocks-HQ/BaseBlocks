"use client";

import { useDebounceCallback } from "@/hooks";
import type { ParagraphContent } from "@/types";
import { useCallback, useEffect, useRef, useState } from "react";
import type { BlockEditorBaseProps } from "../types";

export function ParagraphEditor({
  block,
  onUpdate,
  onSaveStatusChange,
}: BlockEditorBaseProps) {
  const content = block.content as ParagraphContent;
  const [localText, setLocalText] = useState(content.text || "");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const autoResize = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, []);

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

  useEffect(() => {
    setLocalText(content.text || "");
  }, [block._id]);

  useEffect(() => {
    autoResize();
  }, [localText, autoResize]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setLocalText(newText);
    onSaveStatusChange?.("pending");
    debouncedSave(newText);
  };

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={localText}
        onChange={handleChange}
        className="w-full resize-none border-none bg-transparent focus:outline-none overflow-hidden"
        placeholder="Start writing..."
        rows={1}
      />
    </div>
  );
}
