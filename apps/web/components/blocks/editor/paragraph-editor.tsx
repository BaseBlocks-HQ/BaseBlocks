"use client";

import { useCallback, useEffect, useState } from "react";
import { useDebounceCallback } from "@/hooks";
import type { BlockEditorBaseProps } from "../types";
import type { ParagraphContent } from "@/types";

export function ParagraphEditor({
  block,
  onUpdate,
  onSaveStatusChange,
}: BlockEditorBaseProps) {
  const content = block.content as ParagraphContent;
  const [localText, setLocalText] = useState(content.text || "");

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

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setLocalText(newText);
    onSaveStatusChange?.("pending");
    debouncedSave(newText);
  };

  return (
    <div className="relative">
      <textarea
        value={localText}
        onChange={handleChange}
        className="w-full min-h-[100px] resize-none border-none bg-transparent focus:outline-none"
        placeholder="Start writing..."
      />
    </div>
  );
}
