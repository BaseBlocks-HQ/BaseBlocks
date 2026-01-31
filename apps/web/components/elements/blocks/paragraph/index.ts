/**
 * Paragraph block element
 * Plain text content
 */

import { AlignLeft } from "lucide-react";
import { registerElement } from "../../registry";
import { DEFAULT_BLOCK_CONTENT } from "@/types/elements";
import { ParagraphPreview } from "./paragraph-preview";

// Re-export existing components
export { ParagraphEditor } from "@/components/blocks/editor/paragraph-editor";
export { ParagraphRenderer } from "@/components/blocks/renderer/paragraph-renderer";
export { ParagraphPreview } from "./paragraph-preview";

// Register the element
registerElement({
  type: "paragraph",
  category: "blocks",
  label: "Paragraph",
  description: "Plain text content",
  icon: AlignLeft,
  keywords: ["text", "body", "content", "write"],
  preview: ParagraphPreview,
  defaultContent: DEFAULT_BLOCK_CONTENT.paragraph,
});
