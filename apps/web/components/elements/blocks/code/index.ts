/**
 * Code block element
 * Syntax-highlighted code snippets
 */

import { Code } from "lucide-react";
import { registerElement } from "../../registry";
import { DEFAULT_BLOCK_CONTENT } from "@/types/elements";
import { CodePreview } from "./code-preview";

// Re-export existing components
export { CodeEditor } from "@/components/blocks/editor/code-editor";
export { CodeRenderer } from "@/components/blocks/renderer/code-renderer";
export { CodePreview } from "./code-preview";

// Register the element
registerElement({
  type: "code",
  category: "blocks",
  label: "Code",
  description: "Code snippet with syntax highlighting",
  icon: Code,
  keywords: ["code", "snippet", "programming", "syntax", "script"],
  preview: CodePreview,
  defaultContent: DEFAULT_BLOCK_CONTENT.code,
});
