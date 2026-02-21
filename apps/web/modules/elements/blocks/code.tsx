"use client";

import { cn } from "@/lib/utils";
import { useAutoSave } from "@/modules/elements/hooks/use-auto-save";
import { DEFAULT_BLOCK_CONTENT } from "@baseblocks/types/elements";
import { Code } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type {
  ElementEditorProps,
  ElementPreviewProps,
  ElementRendererProps,
} from "../framework/registry";
import { registerElement } from "../framework/registry";

function CodeEditor({
  content,
  onUpdate,
  onSaveStatusChange,
}: ElementEditorProps<"code">) {
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
    setLocalText(content.text || "");
    requestAnimationFrame(autoResize);
  }, [content.text, autoResize]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setLocalText(newText);
    onSaveStatusChange?.("pending");
    save({ ...content, text: newText });
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

function CodeRenderer({ content }: ElementRendererProps<"code">) {
  return (
    <pre className="my-4 p-4 bg-zinc-950 dark:bg-muted rounded-lg overflow-x-auto">
      <code className="text-sm font-mono whitespace-pre-wrap text-zinc-100">
        {content.text}
      </code>
    </pre>
  );
}

function CodePreview({ className }: ElementPreviewProps) {
  return (
    <div className={cn("w-full h-full p-3", className)}>
      <div className="w-full h-full bg-muted rounded-lg p-2 flex flex-col gap-1 font-mono">
        <div className="h-1 w-1/2 bg-muted-foreground/30 rounded" />
        <div className="h-1 w-3/4 bg-muted-foreground/25 rounded" />
        <div className="h-1 w-1/3 bg-muted-foreground/20 rounded" />
      </div>
    </div>
  );
}

registerElement({
  type: "code",
  category: "blocks",
  label: "Code",
  description: "Code snippet with syntax highlighting",
  icon: Code,
  keywords: ["code", "snippet", "programming", "syntax", "script"],
  editor: CodeEditor,
  renderer: CodeRenderer,
  preview: CodePreview,
  defaultContent: DEFAULT_BLOCK_CONTENT.code,
});
