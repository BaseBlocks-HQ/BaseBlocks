/**
 * Paragraph block element
 * Plain text content
 */

import { AlignLeft } from "lucide-react";
import { registerElement } from "../../registry";
import { DEFAULT_BLOCK_CONTENT } from "@/types/elements";
import { ParagraphPreview } from "./paragraph-preview";
import { ParagraphEditor } from "./paragraph-editor";
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
