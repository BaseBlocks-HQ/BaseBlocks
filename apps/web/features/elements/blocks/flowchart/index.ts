/**
 * Flowchart block element
 * Mermaid diagram rendering with live preview
 */

import { DEFAULT_BLOCK_CONTENT } from "@baseblocks/types/elements";
import { Workflow } from "lucide-react";
import { registerElement } from "../../registry";
import { FlowchartEditor } from "./flowchart-editor";
import { FlowchartPreview } from "./flowchart-preview";
import { FlowchartRenderer } from "./flowchart-renderer";

// Re-export components
export { FlowchartEditor, FlowchartRenderer, FlowchartPreview };
export { DiagramEditor } from "./diagram-editor";
export { DiagramViewer } from "./diagram-viewer";

// Register the element
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
