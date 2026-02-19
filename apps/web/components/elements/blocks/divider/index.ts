/**
 * Divider block element
 * Horizontal line separator
 */

import { DEFAULT_BLOCK_CONTENT } from "@repo/types/elements";
import { Minus } from "lucide-react";
import { registerElement } from "../../registry";
import { DividerEditor } from "./divider-editor";
import { DividerPreview } from "./divider-preview";
import { DividerRenderer } from "./divider-renderer";

// Re-export components
export { DividerEditor, DividerRenderer, DividerPreview };

// Register the element
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
