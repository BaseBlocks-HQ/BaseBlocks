import { PanelRight } from "lucide-react";
import { registerLayout } from "../framework/registry";
import { themedPickerImagePreview } from "../framework/themed-picker-image";

const VerticalPreview = themedPickerImagePreview(
  "/editor/picker/layouts/vertical-light.png",
  "/editor/picker/layouts/vertical-dark.png",
);

registerLayout({
  type: "vertical",
  category: "layouts",
  label: "Sidebar",
  description: "Sidebar beside main content",
  icon: PanelRight,
  keywords: ["sidebar", "vertical", "panel", "aside"],
  preview: VerticalPreview,
});
