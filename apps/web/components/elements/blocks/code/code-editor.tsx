"use client";

import type { ElementEditorProps } from "@/components/elements/registry";
import { useDebounceCallback } from "@/hooks";
import { useCallback, useEffect, useRef, useState } from "react";

export function CodeEditor({
  id,
  content,
  isSelected,
  onUpdate,
  onSaveStatusChange,
}: ElementEditorProps<"code">) {
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
    <div className="bg-zinc-950 dark:bg-muted text-zinc-100 rounded-lg p-4 font-mono text-sm transition-all hover:ring-2 hover:ring-zinc-700">
      <textarea
        ref={textareaRef}
        value={localText}
        onChange={handleChange}
        className="w-full resize-none border-none bg-transparent focus:outline-none text-zinc-100 overflow-hidden"
        placeholder="// Code here..."
        spellCheck={false}
        rows={1}
      />
    </div>
  );
}
