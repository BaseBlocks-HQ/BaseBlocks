"use client";

import type { EditorPermissions, SiteData } from "@/modules/shared/types";
import type { UndoCommand } from "@/modules/shared/undo";
import {
  useUndoKeyboardShortcuts,
  useUndoManager,
} from "@/modules/shared/undo";
import { type ReactNode, createContext, use, useState } from "react";

interface EditingSubpage {
  pageId: string;
}

interface EditorSelection {
  layoutId: string | null;
  slotId: string | null;
  blockId: string | null;
}

interface EditorContextValue {
  siteId: string;
  selection: EditorSelection;
  selectLayout: (layoutId: string | null) => void;
  selectSlot: (layoutId: string, slotId: string | null) => void;
  selectBlock: (
    layoutId: string,
    slotId: string,
    blockId: string | null,
  ) => void;
  clearSelection: () => void;
  // Subpage editing (side-by-side panel)
  editingSubpage: EditingSubpage | null;
  openSubpageEditor: (subpage: EditingSubpage) => void;
  closeSubpageEditor: () => void;
  // Permissions
  canEdit: boolean;
  isAdmin: boolean;
  isViewer: boolean;
  isPermissionsLoading: boolean;
  // Deploy tracking - derived from timestamps
  hasUndeployedChanges: boolean;
  // Page-level tabs
  activeTabId: string | null;
  setActiveTabId: (tabId: string | null) => void;
  // Undo/Redo
  currentPageId: string | null;
  setCurrentPageId: (pageId: string | null) => void;
  pushCommand: (cmd: Omit<UndoCommand, "id" | "timestamp">) => void;
  undo: (pageId?: string) => Promise<void>;
  redo: (pageId?: string) => Promise<void>;
  canUndo: (pageId?: string) => boolean;
  canRedo: (pageId?: string) => boolean;
  isUndoRedoExecuting: boolean;
  // Editor controls visibility
  showControls: boolean;
  toggleControls: () => void;
}

const EditorContext = createContext<EditorContextValue | null>(null);

interface EditorProviderProps {
  siteId: string;
  site?: SiteData;
  permissions: EditorPermissions;
  children: ReactNode;
}

export function EditorProvider({
  siteId,
  site,
  permissions,
  children,
}: EditorProviderProps) {
  const [selection, setSelection] = useState<EditorSelection>({
    layoutId: null,
    slotId: null,
    blockId: null,
  });
  const [uiState, setUiState] = useState(() => {
    const initialShowControls = (() => {
      if (typeof window === "undefined") return true;
      const stored = localStorage.getItem("editor:showControls");
      return stored === null ? true : stored === "true";
    })();

    return {
      editingSubpage: null as EditingSubpage | null,
      activeTabId: null as string | null,
      currentPageId: null as string | null,
      showControls: initialShowControls,
    };
  });

  // Derive hasUndeployedChanges from site data
  const hasUndeployedChanges = site
    ? (site.contentModifiedAt ?? 0) > (site.lastDeployedAt ?? 0)
    : false;

  const {
    canEdit,
    isAdmin,
    isViewer,
    isLoading: isPermissionsLoading,
  } = permissions;

  // Undo/Redo manager
  const {
    pushCommand,
    undo,
    redo,
    canUndo,
    canRedo,
    isExecuting: isUndoRedoExecuting,
  } = useUndoManager();

  // Keyboard shortcuts for undo/redo
  useUndoKeyboardShortcuts({
    undo,
    redo,
    canUndo,
    canRedo,
    canEdit,
    currentPageId: uiState.currentPageId,
  });

  const selectLayout = (layoutId: string | null) => {
    setSelection({
      layoutId,
      slotId: null,
      blockId: null,
    });
  };

  const selectSlot = (layoutId: string, slotId: string | null) => {
    setSelection({
      layoutId,
      slotId,
      blockId: null,
    });
  };

  const selectBlock = (
    layoutId: string,
    slotId: string,
    blockId: string | null,
  ) => {
    setSelection({
      layoutId,
      slotId,
      blockId,
    });
  };

  const clearSelection = () => {
    setSelection({
      layoutId: null,
      slotId: null,
      blockId: null,
    });
  };

  const openSubpageEditor = (subpage: EditingSubpage) => {
    setUiState((current) => ({
      ...current,
      editingSubpage: subpage,
    }));
  };

  const closeSubpageEditor = () => {
    setUiState((current) => ({
      ...current,
      editingSubpage: null,
    }));
  };

  return (
    <EditorContext.Provider
      value={{
        siteId,
        selection,
        selectLayout,
        selectSlot,
        selectBlock,
        clearSelection,
        editingSubpage: uiState.editingSubpage,
        openSubpageEditor,
        closeSubpageEditor,
        canEdit,
        isAdmin,
        isViewer,
        isPermissionsLoading,
        hasUndeployedChanges,
        activeTabId: uiState.activeTabId,
        setActiveTabId: (activeTabId) =>
          setUiState((current) => ({
            ...current,
            activeTabId,
          })),
        currentPageId: uiState.currentPageId,
        setCurrentPageId: (currentPageId) =>
          setUiState((current) => ({
            ...current,
            currentPageId,
          })),
        pushCommand,
        undo,
        redo,
        canUndo,
        canRedo,
        isUndoRedoExecuting,
        showControls: uiState.showControls,
        toggleControls: () =>
          setUiState((current) => {
            const showControls = !current.showControls;
            localStorage.setItem("editor:showControls", String(showControls));
            return {
              ...current,
              showControls,
            };
          }),
      }}
    >
      {children}
    </EditorContext.Provider>
  );
}

export function useEditorContext() {
  const context = use(EditorContext);
  if (!context) {
    throw new Error("useEditorContext must be used within an EditorProvider");
  }
  return context;
}

// Optional hook that returns null if not in editor context (for use in renderers)
export function useEditorContextOptional() {
  return use(EditorContext);
}
