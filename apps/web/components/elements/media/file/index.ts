/**
 * File media element
 * Downloadable file attachment
 */

import { FileText } from "lucide-react";
import { registerElement } from "../../registry";
import { DEFAULT_MEDIA_CONTENT } from "@/types/elements";
import { FilePreview } from "./file-preview";

// Re-export existing renderer (no editor exists yet)
export { FileRenderer } from "@/components/blocks/renderer/file-renderer";
export { FilePreview } from "./file-preview";

// Register the element
registerElement({
  type: "file",
  category: "media",
  label: "File",
  description: "Downloadable file attachment",
  icon: FileText,
  keywords: ["file", "download", "attachment", "document"],
  preview: FilePreview,
  defaultContent: DEFAULT_MEDIA_CONTENT.file,
});
