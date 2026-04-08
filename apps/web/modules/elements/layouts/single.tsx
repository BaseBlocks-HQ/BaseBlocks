import { Square } from "lucide-react";
import { registerLayout } from "../framework/registry";
import { themedPickerImagePreview } from "../framework/themed-picker-image";

const SinglePreview = themedPickerImagePreview(
  "/editor/picker/layouts/single-light-v2.png",
  "/editor/picker/layouts/single-dark-v2.png",
);

registerLayout({
  type: "single",
  category: "layouts",
  label: "Single",
  description: "Full-width single column",
  icon: Square,
  keywords: ["single", "full", "one", "column"],
  preview: SinglePreview,
});
