/**
 * Sub-page block element
 * Creates a linked sub-page that opens in a side panel
 */

import { DEFAULT_BLOCK_CONTENT } from "@repo/types/elements";
import { FileText } from "lucide-react";
import { registerElement } from "../../registry";
import { SubpageEditor } from "./subpage-editor";
import { SubpagePreview } from "./subpage-preview";
import { SubpageRenderer } from "./subpage-renderer";

// Re-export components
export { SubpageEditor, SubpageRenderer, SubpagePreview };

// Register the element
registerElement({
  type: "subpage",
  category: "blocks",
  label: "Sub-page",
  description: "Create a linked sub-page that opens in a side panel",
  icon: FileText,
  keywords: ["page", "link", "subpage", "process", "document", "nested"],
  editor: SubpageEditor,
  renderer: SubpageRenderer,
  preview: SubpagePreview,
  defaultContent: DEFAULT_BLOCK_CONTENT.subpage,
});
