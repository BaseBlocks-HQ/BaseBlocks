/**
 * Form Element
 * Interactive form builder with drag-and-drop fields
 */

import { DEFAULT_FORM_CONTENT } from "@baseblocks/types/elements";
import { FileText } from "lucide-react";
import { registerElement } from "../../registry";
import { FormEditor } from "./form-editor";
import { FormPreview } from "./form-preview";
import { FormRenderer } from "./form-renderer";

// Register the element
registerElement({
  type: "form",
  category: "forms",
  label: "Form",
  description: "Build interactive forms with drag-and-drop fields",
  icon: FileText,
  keywords: ["form", "input", "contact", "survey", "feedback", "submit"],
  editor: FormEditor,
  renderer: FormRenderer,
  preview: FormPreview,
  defaultContent: DEFAULT_FORM_CONTENT,
});

// Re-export components
export { FormEditor, FormRenderer, FormPreview };
