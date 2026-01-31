/**
 * Heading block element
 * Titles and headings with multiple levels
 */

import { Heading } from "lucide-react";
import { registerElement } from "../../registry";
import { DEFAULT_BLOCK_CONTENT } from "@/types/elements";
import { HeadingPreview } from "./heading-preview";

// Re-export existing components
export { HeadingEditor } from "@/components/blocks/editor/heading-editor";
export { HeadingRenderer } from "@/components/blocks/renderer/heading-renderer";
export { HeadingPreview } from "./heading-preview";

// Register the element
registerElement({
  type: "heading",
  category: "blocks",
  label: "Heading",
  description: "A title or heading with adjustable size",
  icon: Heading,
  keywords: ["title", "h1", "h2", "h3", "h4", "h5", "header"],
  preview: HeadingPreview,
  defaultContent: DEFAULT_BLOCK_CONTENT.heading,
});
