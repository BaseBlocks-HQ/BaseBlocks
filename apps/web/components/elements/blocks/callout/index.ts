/**
 * Callout block element
 * Highlighted message box with variants
 */

import { DEFAULT_BLOCK_CONTENT } from "@/types/elements";
import { MessageSquare } from "lucide-react";
import { registerElement } from "../../registry";
import { CalloutEditor } from "./callout-editor";
import { CalloutPreview } from "./callout-preview";
import { CalloutRenderer } from "./callout-renderer";

// Re-export components
export { CalloutEditor, CalloutRenderer, CalloutPreview };

// Register the element
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
