/**
 * Form element — import this file to register with the registry.
 */

import { DEFAULT_FORM_CONTENT } from "@baseblocks/types/elements";
import { FileText } from "lucide-react";
import { registerElement } from "../framework/registry";
import { FormEditor } from "./editor";
import { FormPreview } from "./preview";
import { FormRenderer } from "./renderer";

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
