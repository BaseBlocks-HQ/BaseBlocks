/**
 * Block spacer element
 * Vertical spacing within content (renamed from "spacer" to avoid confusion with layout spacer)
 */

import { MoveVertical } from "lucide-react";
import { registerElement } from "../../registry";
import { DEFAULT_BLOCK_CONTENT } from "@/types/elements";
import { BlockSpacerPreview } from "./block-spacer-preview";

// Re-export existing components (note: using the old "spacer" names)
export { SpacerEditor as BlockSpacerEditor } from "@/components/blocks/editor/spacer-editor";
export { SpacerRenderer as BlockSpacerRenderer } from "@/components/blocks/renderer/spacer-renderer";
export { BlockSpacerPreview } from "./block-spacer-preview";

// Register the element
registerElement({
  type: "block-spacer",
  category: "blocks",
  label: "Spacer",
  description: "Vertical spacing between content",
  icon: MoveVertical,
  keywords: ["space", "gap", "vertical", "padding", "margin"],
  preview: BlockSpacerPreview,
  defaultContent: DEFAULT_BLOCK_CONTENT["block-spacer"],
});
