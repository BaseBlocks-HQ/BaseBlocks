/**
 * Flowchart block element
 * Mermaid diagram rendering with live preview
 */

import { DEFAULT_BLOCK_CONTENT } from "@baseblocks/types/elements";
import { Workflow } from "lucide-react";
import { registerElement } from "../../framework/registry";
import { FlowchartEditor } from "./editor";
import { FlowchartPreview } from "./preview";
import { FlowchartRenderer } from "./renderer";

export { FlowchartEditor, FlowchartRenderer, FlowchartPreview };
export { DiagramEditor } from "./diagram-editor";
export { DiagramViewer } from "./diagram-viewer";

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
  preview: FlowchartPreview,
  defaultContent: DEFAULT_BLOCK_CONTENT.flowchart,
});
