/**
 * Code block element
 * Syntax-highlighted code snippets
 */

import { DEFAULT_BLOCK_CONTENT } from "@/types/elements";
import { Code } from "lucide-react";
import { registerElement } from "../../registry";
import { CodeEditor } from "./code-editor";
import { CodePreview } from "./code-preview";
import { CodeRenderer } from "./code-renderer";

// Re-export components
export { CodeEditor, CodeRenderer, CodePreview };

// Register the element
registerElement({
  type: "code",
  category: "blocks",
  label: "Code",
  description: "Code snippet with syntax highlighting",
  icon: Code,
  keywords: ["code", "snippet", "programming", "syntax", "script"],
  editor: CodeEditor,
  renderer: CodeRenderer,
  preview: CodePreview,
  defaultContent: DEFAULT_BLOCK_CONTENT.code,
});
