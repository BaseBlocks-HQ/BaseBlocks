/**
 * Rich text block element
 * Full rich text editor powered by BlockNote
 */

import { DEFAULT_BLOCK_CONTENT } from "@repo/types/elements";
import { TextCursorInput } from "lucide-react";
import { registerElement } from "../../registry";
import { RichTextEditor } from "./richtext-editor";
import { RichTextPreview } from "./richtext-preview";
import { RichTextRenderer } from "./richtext-renderer";

// Re-export components
export { RichTextEditor, RichTextRenderer, RichTextPreview };

// Register the element
registerElement({
  type: "richtext",
  category: "blocks",
  label: "Rich Text",
  description: "Rich text editor with formatting, lists, and more",
  icon: TextCursorInput,
  keywords: [
    "text",
    "rich",
    "editor",
    "blocknote",
    "write",
    "format",
    "wysiwyg",
  ],
  editor: RichTextEditor,
  renderer: RichTextRenderer,
  preview: RichTextPreview,
  defaultContent: DEFAULT_BLOCK_CONTENT.richtext,
});
