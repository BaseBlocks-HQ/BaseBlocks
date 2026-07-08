/**
 * Flowchart block element
 * Mermaid diagram rendering with live preview
 */

import { DEFAULT_BLOCK_CONTENT } from "@baseblocks/domain/elements";
import { Workflow } from "lucide-react";
import { registerElement } from "../../authoring/registry";
import { themedPickerImagePreview } from "../../authoring/themed-picker-image";
import { FlowchartEditor } from "./editor";
import { FlowchartRenderer } from "./renderer";

const preview = themedPickerImagePreview(
  "/editor/picker/blocks/flowchart-light.png",
  "/editor/picker/blocks/flowchart-dark.png",
);

registerElement({
  type: "flowchart",
  category: "blocks",
  label: "Flowchart",
  description: "Mermaid diagram with live preview",
  icon: Workflow,
  keywords: [
    "flowchart",
    "diagram",
    "mermaid",
    "process",
    "workflow",
    "logigramme",
  ],
  editor: FlowchartEditor,
  renderer: FlowchartRenderer,
  preview,
  defaultContent: DEFAULT_BLOCK_CONTENT.flowchart,
});
