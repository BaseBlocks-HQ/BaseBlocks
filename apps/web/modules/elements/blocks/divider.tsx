"use client";
import { DEFAULT_BLOCK_CONTENT } from "@baseblocks/types/elements";
import { Minus } from "lucide-react";
import type {
  ElementEditorProps,
  ElementRendererProps,
} from "../framework/registry";
import { registerElement } from "../framework/registry";
import { themedPickerImagePreview } from "../framework/themed-picker-image";

function DividerEditor(_props: ElementEditorProps<"divider">) {
  return (
    <div className="group relative py-2">
      <hr className="border-border transition-colors group-hover:border-muted-foreground/50" />
    </div>
  );
}

function DividerRenderer(_props: ElementRendererProps<"divider">) {
  return <hr className="my-8" />;
}

const DividerPreview = themedPickerImagePreview(
  "/editor/picker/blocks/divider-light.png",
  "/editor/picker/blocks/divider-dark.png",
);

registerElement({
  type: "divider",
  category: "blocks",
  label: "Divider",
  description: "Horizontal line separator",
  icon: Minus,
  keywords: ["line", "separator", "hr", "horizontal"],
  editor: DividerEditor,
  renderer: DividerRenderer,
  preview: DividerPreview,
  defaultContent: DEFAULT_BLOCK_CONTENT.divider,
});
