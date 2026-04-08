"use client";
import { useAutoSave } from "@/modules/elements/hooks/use-auto-save";
import { DEFAULT_BLOCK_CONTENT } from "@baseblocks/types/elements";
import { Code } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type {
  ElementEditorProps,
  ElementRendererProps,
} from "../framework/registry";
import { registerElement } from "../framework/registry";
import { themedPickerImagePreview } from "../framework/themed-picker-image";

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
    requestAnimationFrame(autoResize);
  }, [autoResize]);

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

const CodePreview = themedPickerImagePreview(
  "/editor/picker/blocks/code-light.png",
  "/editor/picker/blocks/code-dark.png",
);

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
