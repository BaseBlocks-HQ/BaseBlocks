/**
 * Heading block element
 * Titles and headings with multiple levels
 */

import { Heading } from "lucide-react";
import { registerElement } from "../../registry";
import { DEFAULT_BLOCK_CONTENT } from "@/types/elements";
import { HeadingPreview } from "./heading-preview";
import { HeadingEditor } from "./heading-editor";
import { HeadingRenderer } from "./heading-renderer";

// Re-export components
export { HeadingEditor, HeadingRenderer, HeadingPreview };

// Register the element
registerElement({
  type: "heading",
  category: "blocks",
  label: "Heading",
  description: "A title or heading with adjustable size",
  icon: Heading,
  keywords: ["title", "h1", "h2", "h3", "h4", "h5", "header"],
  editor: HeadingEditor,
  renderer: HeadingRenderer,
  preview: HeadingPreview,
  defaultContent: DEFAULT_BLOCK_CONTENT.heading,
});
