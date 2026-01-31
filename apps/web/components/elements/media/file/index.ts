/**
 * File media element
 * Downloadable file attachment
 */

import { FileText } from "lucide-react";
import { registerElement } from "../../registry";
import { DEFAULT_MEDIA_CONTENT } from "@/types/elements";
import { FilePreview } from "./file-preview";
import { FileRenderer } from "./file-renderer";

// Re-export components (no editor exists yet)
export { FileRenderer, FilePreview };

// Register the element
registerElement({
  type: "file",
  category: "media",
  label: "File",
  description: "Downloadable file attachment",
  icon: FileText,
  keywords: ["file", "download", "attachment", "document"],
  renderer: FileRenderer,
  preview: FilePreview,
  defaultContent: DEFAULT_MEDIA_CONTENT.file,
});
