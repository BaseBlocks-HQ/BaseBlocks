"use client";

import { useCallback, useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { useDebounceCallback } from "@/hooks";
import type { BlockEditorBaseProps } from "../types";
import type { HeadingContent } from "@/types";

export function HeadingEditor({
  block,
  onUpdate,
  onSaveStatusChange,
}: BlockEditorBaseProps) {
  const content = block.content as HeadingContent;
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newText = e.target.value;
    setLocalText(newText);
    onSaveStatusChange?.("pending");
    debouncedSave(newText);
  };

  return (
    <div className="relative">
      <Input
        value={localText}
        onChange={handleChange}
        className="text-xl font-semibold border-none shadow-none px-0 focus-visible:ring-0 bg-transparent dark:bg-transparent"
        placeholder="Heading..."
      />
    </div>
  );
}
