/**
 * Divider block element
 * Horizontal line separator
 */

import { Minus } from "lucide-react";
import { registerElement } from "../../registry";
import { DEFAULT_BLOCK_CONTENT } from "@/types/elements";
import { DividerPreview } from "./divider-preview";

// Re-export existing components
export { DividerEditor } from "@/components/blocks/editor/divider-editor";
export { DividerRenderer } from "@/components/blocks/renderer/divider-renderer";
export { DividerPreview } from "./divider-preview";

// Register the element
registerElement({
  type: "divider",
  category: "blocks",
  label: "Divider",
  description: "Horizontal line separator",
  icon: Minus,
  keywords: ["line", "separator", "hr", "horizontal"],
  preview: DividerPreview,
  defaultContent: DEFAULT_BLOCK_CONTENT.divider,
});
