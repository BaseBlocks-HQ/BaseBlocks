/**
 * Editor components barrel exports
 *
 * Core editor engine re-exported from @baseblocks/editor.
 * App-shell components (sidebar, header, site-editor) stay local.
 */

// Re-export from @baseblocks/editor for backward compat
export {
  EditorProvider,
  useEditorContext,
  useEditorContextOptional,
  PageEditor,
  SaveIndicator,
  PreviewButton,
} from "@baseblocks/editor";

// Local app-shell components
export { SiteEditor } from "./site-editor";
export { EditorSidebar } from "./editor-sidebar";
export { EditorHeader } from "./editor-header";
