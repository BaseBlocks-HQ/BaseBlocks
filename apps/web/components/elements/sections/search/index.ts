/**
 * Search section element
 * Document search functionality
 */

import { Search } from "lucide-react";
import { registerElement } from "../../registry";
import { DEFAULT_SECTION_CONTENT } from "@/types/elements";
import { SearchPreview } from "./search-preview";

// Re-export existing components
export { SearchEditor } from "@/components/blocks/editor/search-editor";
export { SearchRenderer } from "@/components/blocks/renderer/search-renderer";
export { SearchPreview } from "./search-preview";

// Register the element
registerElement({
  type: "search",
  category: "sections",
  label: "Search",
  description: "Document search with filters",
  icon: Search,
  keywords: ["search", "find", "query", "lookup", "filter"],
  preview: SearchPreview,
  defaultContent: DEFAULT_SECTION_CONTENT.search,
});
