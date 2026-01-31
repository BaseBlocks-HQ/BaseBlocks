/**
 * Block spacer element
 * Vertical spacing within content (renamed from "spacer" to avoid confusion with layout spacer)
 */

import { MoveVertical } from "lucide-react";
import { registerElement } from "../../registry";
import { DEFAULT_BLOCK_CONTENT } from "@/types/elements";
import { BlockSpacerPreview } from "./block-spacer-preview";
import { SpacerEditor as BlockSpacerEditor } from "./spacer-editor";
import { SpacerRenderer as BlockSpacerRenderer } from "./spacer-renderer";

// Re-export components
export { BlockSpacerEditor, BlockSpacerRenderer, BlockSpacerPreview };

// Register the element
registerElement({
  type: "block-spacer",
  category: "blocks",
  label: "Spacer",
  description: "Vertical spacing between content",
  icon: MoveVertical,
  keywords: ["space", "gap", "vertical", "padding", "margin"],
  editor: BlockSpacerEditor,
  renderer: BlockSpacerRenderer,
  preview: BlockSpacerPreview,
  defaultContent: DEFAULT_BLOCK_CONTENT["block-spacer"],
});
