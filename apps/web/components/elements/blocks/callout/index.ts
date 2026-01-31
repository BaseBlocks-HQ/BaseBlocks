/**
 * Callout block element
 * Highlighted message box with variants
 */

import { MessageSquare } from "lucide-react";
import { registerElement } from "../../registry";
import { DEFAULT_BLOCK_CONTENT } from "@/types/elements";
import { CalloutPreview } from "./callout-preview";

// Re-export existing components
export { CalloutEditor } from "@/components/blocks/editor/callout-editor";
export { CalloutRenderer } from "@/components/blocks/renderer/callout-renderer";
export { CalloutPreview } from "./callout-preview";

// Register the element
registerElement({
  type: "callout",
  category: "blocks",
  label: "Callout",
  description: "Highlighted message box",
  icon: MessageSquare,
  keywords: ["alert", "note", "warning", "info", "tip", "message"],
  preview: CalloutPreview,
  defaultContent: DEFAULT_BLOCK_CONTENT.callout,
});
