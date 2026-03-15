"use client";

import { cn } from "@/lib/utils";
import { useAutoSave } from "@/modules/elements/hooks/use-auto-save";
import { DEFAULT_BLOCK_CONTENT } from "@baseblocks/types/elements";
import { MessageSquare } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type {
  ElementEditorProps,
  ElementPreviewProps,
  ElementRendererProps,
} from "../framework/registry";
import { registerElement } from "../framework/registry";

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
    save({ ...content, text: newText });
  };

  return (
    <div className="bg-muted border border-primary/30 rounded-lg p-4 transition-colors hover:border-primary/50">
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
    <div className="my-4 bg-muted border-l-4 border-primary rounded-lg p-4">
      <p className="whitespace-pre-wrap">{content.text}</p>
    </div>
  );
}

function CalloutPreview({ className }: ElementPreviewProps) {
  return (
    <div className={cn("w-full h-full p-3 flex items-center", className)}>
      <div className="w-full h-full bg-muted rounded-lg border flex items-center px-3">
        <div className="flex flex-col gap-1 flex-1">
          <div className="h-1.5 w-3/4 bg-muted-foreground/30 rounded" />
          <div className="h-1.5 w-1/2 bg-muted-foreground/20 rounded" />
        </div>
      </div>
    </div>
  );
}

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
