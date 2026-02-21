/**
 * Editor module barrel exports
 *
 * All editor code now lives here — no external package dependency.
 */

// Contexts
export {
  EditorProvider,
  useEditorContext,
  useEditorContextOptional,
} from "./contexts/editor-context";
export type { EditingSubpage } from "./contexts/editor-context";
export {
  EditorMutationsProvider,
  useEditorMutations,
} from "./contexts/editor-mutations";
export type { EditorMutations } from "./contexts/editor-mutations";

// Editor engine components
export { PageEditor } from "./components/page-editor";
export { ElementPicker } from "./components/element-picker";

// Feature UI components
export { DeployDialog } from "./components/deploy-dialog";
export { DeploymentHistoryPanel } from "./components/deployment-history-panel";
export { ShareDialog } from "./components/share-dialog";
export { RollbackDialog } from "./components/rollback-dialog";
export { PreviewButton } from "./components/preview-button";
export { SaveIndicator } from "./components/save-indicator";
export { SubpageEditPanel } from "./components/subpage-edit-panel";

// App-shell components
export { SiteEditor } from "./site-editor";
export { EditorSidebar } from "./editor-sidebar";
export { EditorHeader } from "./editor-header";

// Types
export type {
  SiteData,
  PageData,
  PageTab,
  LayoutDoc,
  LayoutSlotDoc,
  LayoutBlockDoc,
  EditorPermissions,
  SharingSettings,
  AccessCodeData,
  DeploymentData,
} from "./types";
