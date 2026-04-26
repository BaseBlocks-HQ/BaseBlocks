"use client";

import { useAutoSave } from "@/modules/elements/hooks/use-auto-save";
import { DEFAULT_BLOCK_CONTENT } from "@baseblocks/types/elements";
import { MessageSquare } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type {
  ElementEditorProps,
  ElementRendererProps,
} from "../framework/registry";
import { registerElement } from "../framework/registry";
import { themedPickerImagePreview } from "../framework/themed-picker-image";

function CalloutEditor({
  content,
  onUpdate,
  onSaveStatusChange,
}: ElementEditorProps<"callout">) {
  const [localText, setLocalText] = useState(content.text || "");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const save = useAutoSave(onUpdate, onSaveStatusChange);

  const autoResize = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, []);

  useEffect(() => {
    requestAnimationFrame(autoResize);
  }, [autoResize]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setLocalText(newText);
    onSaveStatusChange?.("pending");
    requestAnimationFrame(autoResize);
    save({ ...content, text: newText });
  };

  return (
    <div className="bg-muted rounded-lg p-4 transition-colors">
      <textarea
        ref={textareaRef}
        value={localText}
        onChange={handleChange}
        className="w-full resize-none border-none bg-transparent focus:outline-none overflow-hidden"
        placeholder="Callout text..."
        rows={1}
      />
    </div>
  );
}

function CalloutRenderer({ content }: ElementRendererProps<"callout">) {
  return (
    <div className="my-4 bg-muted rounded-lg p-4">
      <p className="whitespace-pre-wrap text-foreground">{content.text}</p>
    </div>
  );
}

const CalloutPreview = themedPickerImagePreview(
  "/editor/picker/blocks/callout-light.png",
  "/editor/picker/blocks/callout-dark.png",
);

registerElement({
  type: "callout",
  category: "blocks",
  label: "Callout",
  description: "Highlighted message box",
  icon: MessageSquare,
  keywords: ["alert", "note", "warning", "info", "tip", "message"],
  editor: CalloutEditor,
  renderer: CalloutRenderer,
  preview: CalloutPreview,
  defaultContent: DEFAULT_BLOCK_CONTENT.callout,
});
