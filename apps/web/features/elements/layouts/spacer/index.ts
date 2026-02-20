/**
 * Spacer layout element
 * Vertical spacing between layouts
 */

import { MoveVertical } from "lucide-react";
import { registerLayout } from "../../registry";
import { SpacerLayoutPreview } from "./spacer-preview";

// Export preview component
export { SpacerLayoutPreview } from "./spacer-preview";

// Register the layout
registerLayout({
  type: "spacer",
  category: "layouts",
  label: "Spacer",
  description: "Vertical spacing",
  icon: MoveVertical,
  keywords: ["spacer", "gap", "space", "vertical"],
  preview: SpacerLayoutPreview,
});
