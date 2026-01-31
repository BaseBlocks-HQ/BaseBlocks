/**
 * Paragraph block element
 * Plain text content
 */

import { DEFAULT_BLOCK_CONTENT } from "@/types/elements";
import { AlignLeft } from "lucide-react";
import { registerElement } from "../../registry";
import { ParagraphEditor } from "./paragraph-editor";
import { ParagraphPreview } from "./paragraph-preview";
import { ParagraphRenderer } from "./paragraph-renderer";

// Re-export components
export { ParagraphEditor, ParagraphRenderer, ParagraphPreview };

// Register the element
registerElement({
  type: "paragraph",
  category: "blocks",
  label: "Paragraph",
  description: "Plain text content",
  icon: AlignLeft,
  keywords: ["text", "body", "content", "write"],
  editor: ParagraphEditor,
  renderer: ParagraphRenderer,
  preview: ParagraphPreview,
  defaultContent: DEFAULT_BLOCK_CONTENT.paragraph,
});
