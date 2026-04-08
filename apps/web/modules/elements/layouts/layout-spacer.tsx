import { MoveVertical } from "lucide-react";
import { registerLayout } from "../framework/registry";
import { themedPickerImagePreview } from "../framework/themed-picker-image";

const SpacerLayoutPreview = themedPickerImagePreview(
  "/editor/picker/layouts/spacer-light.png",
  "/editor/picker/layouts/spacer-dark.png",
);

registerLayout({
  type: "spacer",
  category: "layouts",
  label: "Spacer",
  description: "Vertical spacing",
  icon: MoveVertical,
  keywords: ["spacer", "gap", "space", "vertical"],
  preview: SpacerLayoutPreview,
});
