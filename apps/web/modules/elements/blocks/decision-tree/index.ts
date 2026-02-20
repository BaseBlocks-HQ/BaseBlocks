/**
 * Decision tree block element
 * Interactive hierarchical decision tree with navigable options and rich content
 */

import { DEFAULT_BLOCK_CONTENT } from "@baseblocks/types/elements";
import { GitFork } from "lucide-react";
import { registerElement } from "../../registry";
import { DecisionTreeEditor } from "./tree-editor";
import { DecisionTreePreview } from "./preview";
import { DecisionTreeRenderer } from "./renderer";

// Re-export components
export { DecisionTreeEditor, DecisionTreeRenderer, DecisionTreePreview };

// Register the element
registerElement({
  type: "decision-tree",
  category: "blocks",
  label: "Decision Tree",
  description:
    "Interactive decision tree with branching options and rich content",
  icon: GitFork,
  keywords: [
    "decision",
    "tree",
    "flowchart",
    "branch",
    "wizard",
    "guide",
    "questionnaire",
    "navigation",
  ],
  editor: DecisionTreeEditor,
  renderer: DecisionTreeRenderer,
  preview: DecisionTreePreview,
  defaultContent: DEFAULT_BLOCK_CONTENT["decision-tree"],
});
