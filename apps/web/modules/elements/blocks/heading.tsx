"use client";

import { useAutoSave } from "@/modules/elements/hooks/use-auto-save";
import { DEFAULT_BLOCK_CONTENT } from "@baseblocks/types/elements";
import { Heading } from "lucide-react";
import { useState } from "react";
import ContentEditable from "react-contenteditable";
import type {
  ElementEditorProps,
  ElementRendererProps,
} from "../framework/registry";
import { registerElement } from "../framework/registry";
import { themedPickerImagePreview } from "../framework/themed-picker-image";

function HeadingEditor({
  content,
  onUpdate,
  onSaveStatusChange,
}: ElementEditorProps<"heading">) {
  const [localText, setLocalText] = useState(content.text || "");
  const save = useAutoSave(onUpdate, onSaveStatusChange);

  const handleChange = (e: { target: { value: string } }) => {
    const plainText = e.target.value
      .replace(/<[^>]*>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">");
    setLocalText(plainText);
    onSaveStatusChange?.("pending");
    save({ ...content, text: plainText });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
    }
  };

  const isEmpty = !localText.trim();

  return (
    <div className="relative rounded-md px-2 py-2">
      <ContentEditable
        html={localText.trim() ? localText : ""}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        className="w-full text-xl font-semibold leading-tight outline-none"
      />
      {isEmpty && (
        <span className="absolute left-2 top-2 text-xl font-semibold leading-tight text-muted-foreground pointer-events-none">
          Heading...
        </span>
      )}
    </div>
  );
}

function HeadingRenderer({ content }: ElementRendererProps<"heading">) {
  const level = content.level || 2;

  switch (level) {
    case 1:
      return (
        <h1 className="text-3xl font-semibold mt-6 mb-4">{content.text}</h1>
      );
    case 2:
      return (
        <h2 className="text-2xl font-semibold mt-6 mb-4">{content.text}</h2>
      );
    case 3:
      return (
        <h3 className="text-xl font-semibold mt-6 mb-4">{content.text}</h3>
      );
    case 4:
      return (
        <h4 className="text-lg font-semibold mt-6 mb-4">{content.text}</h4>
      );
    default:
      return <h5 className="font-semibold mt-6 mb-4">{content.text}</h5>;
  }
}

const HeadingPreview = themedPickerImagePreview(
  "/editor/picker/blocks/heading-light.png",
  "/editor/picker/blocks/heading-dark.png",
);

registerElement({
  type: "heading",
  category: "blocks",
  label: "Heading",
  description: "A title or heading with adjustable size",
  icon: Heading,
  keywords: ["title", "h1", "h2", "h3", "h4", "h5", "header"],
  editor: HeadingEditor,
  renderer: HeadingRenderer,
  preview: HeadingPreview,
  defaultContent: DEFAULT_BLOCK_CONTENT.heading,
});
