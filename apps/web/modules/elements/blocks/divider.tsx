"use client";

import { cn } from "@/lib/utils";
import type {
  ElementEditorProps,
  ElementPreviewProps,
  ElementRendererProps,
} from "../registry";
import { DEFAULT_BLOCK_CONTENT } from "@baseblocks/types/elements";
import { Minus } from "lucide-react";
import { registerElement } from "../registry";

function DividerEditor(_props: ElementEditorProps<"divider">) {
  return (
    <div className="relative py-4 group">
      <hr className="border-border transition-colors group-hover:border-muted-foreground/50" />
    </div>
  );
}

function DividerRenderer(_props: ElementRendererProps<"divider">) {
  return <hr className="my-8" />;
}

function DividerPreview({ className }: ElementPreviewProps) {
  return (
    <div className={cn("w-full h-full p-3 flex items-center", className)}>
      <div className="w-full h-px bg-border" />
    </div>
  );
}

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
