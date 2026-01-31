/**
 * Search section element
 * Document search functionality
 */

import { DEFAULT_SECTION_CONTENT } from "@/types/elements";
import { Search } from "lucide-react";
import { registerElement } from "../../registry";
import { SearchEditor } from "./search-editor";
import { SearchPreview } from "./search-preview";
import { SearchRenderer } from "./search-renderer";

// Re-export components
export { SearchEditor, SearchRenderer, SearchPreview };

// Register the element
registerElement({
  type: "search",
  category: "sections",
  label: "Search",
  description: "Document search with filters",
  icon: Search,
  keywords: ["search", "find", "query", "lookup", "filter"],
  editor: SearchEditor,
  renderer: SearchRenderer,
  preview: SearchPreview,
  defaultContent: DEFAULT_SECTION_CONTENT.search,
});
