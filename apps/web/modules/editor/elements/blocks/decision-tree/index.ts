/**
 * Decision tree block element
 * Interactive hierarchical decision tree with navigable options and rich content
 */

import { DEFAULT_BLOCK_CONTENT } from "@baseblocks/domain/elements";
import { GitFork } from "lucide-react";
import { registerElement } from "../../framework/registry";
import { themedPickerImagePreview } from "../../framework/themed-picker-image";
import { DecisionTreeRenderer } from "./renderer";
import { DecisionTreeEditor } from "./tree-editor";

const preview = themedPickerImagePreview(
  "/editor/picker/blocks/decision-tree-light.png",
  "/editor/picker/blocks/decision-tree-dark.png",
);

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
  preview,
  defaultContent: DEFAULT_BLOCK_CONTENT["decision-tree"],
});
