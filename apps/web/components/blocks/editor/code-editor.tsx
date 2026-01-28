"use client";

import { useCallback, useEffect, useState } from "react";
import { useDebounceCallback } from "@/hooks";
import type { BlockEditorBaseProps } from "../types";
import type { CodeContent } from "@/types";

export function CodeEditor({
  block,
  onUpdate,
  onSaveStatusChange,
}: BlockEditorBaseProps) {
  const content = block.content as CodeContent;
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
      <div className="bg-zinc-950 text-zinc-100 rounded-lg p-4 font-mono text-sm">
        <textarea
          value={localText}
          onChange={handleChange}
          className="w-full min-h-[100px] resize-none border-none bg-transparent focus:outline-none text-zinc-100"
          placeholder="// Code here..."
          spellCheck={false}
        />
      </div>
    </div>
  );
}
