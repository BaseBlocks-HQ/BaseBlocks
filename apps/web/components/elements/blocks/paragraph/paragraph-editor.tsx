"use client";

import type { ElementEditorProps } from "@/components/elements/registry";
import { useDebounceCallback } from "@/hooks";
import { useCallback, useEffect, useRef, useState } from "react";

export function ParagraphEditor({
  id,
  content,
  isSelected,
  onUpdate,
  onSaveStatusChange,
}: ElementEditorProps<"paragraph">) {
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
  }, [id]);

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
    <div className="rounded-md px-2 py-1 -mx-2 -my-1 transition-colors hover:bg-muted/50">
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
