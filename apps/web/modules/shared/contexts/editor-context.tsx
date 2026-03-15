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

interface EditorSiteContextValue {
  siteId: string;
  canEdit: boolean;
  isAdmin: boolean;
  isViewer: boolean;
  isPermissionsLoading: boolean;
  hasUndeployedChanges: boolean;
}

interface EditorUiContextValue {
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
  activeTabId: string | null;
  setActiveTabId: (tabId: string | null) => void;
  currentPageId: string | null;
  setCurrentPageId: (pageId: string | null) => void;
  showControls: boolean;
  toggleControls: () => void;
}

interface EditorUndoContextValue {
  pushCommand: (cmd: Omit<UndoCommand, "id" | "timestamp">) => void;
  undo: (pageId?: string) => Promise<void>;
  redo: (pageId?: string) => Promise<void>;
  canUndo: (pageId?: string) => boolean;
  canRedo: (pageId?: string) => boolean;
  isUndoRedoExecuting: boolean;
}

const EditorSiteContext = createContext<EditorSiteContextValue | null>(null);
const EditorUiContext = createContext<EditorUiContextValue | null>(null);
const EditorUndoContext = createContext<EditorUndoContextValue | null>(null);

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

  const siteValue: EditorSiteContextValue = {
    siteId,
    canEdit,
    isAdmin,
    isViewer,
    isPermissionsLoading,
    hasUndeployedChanges,
  };

  const uiValue: EditorUiContextValue = {
    selection,
    selectLayout,
    selectSlot,
    selectBlock,
    clearSelection,
    editingSubpage: uiState.editingSubpage,
    openSubpageEditor,
    closeSubpageEditor,
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
  };

  const undoValue: EditorUndoContextValue = {
    pushCommand,
    undo,
    redo,
    canUndo,
    canRedo,
    isUndoRedoExecuting,
  };

  return (
    <EditorSiteContext.Provider value={siteValue}>
      <EditorUiContext.Provider value={uiValue}>
        <EditorUndoContext.Provider value={undoValue}>
          {children}
        </EditorUndoContext.Provider>
      </EditorUiContext.Provider>
    </EditorSiteContext.Provider>
  );
}

export function useEditorSite() {
  const context = use(EditorSiteContext);
  if (!context) {
    throw new Error("useEditorSite must be used within an EditorProvider");
  }
  return context;
}

export function useEditorSiteOptional() {
  return use(EditorSiteContext);
}

export function useEditorUi() {
  const context = use(EditorUiContext);
  if (!context) {
    throw new Error("useEditorUi must be used within an EditorProvider");
  }
  return context;
}

export function useEditorUiOptional() {
  return use(EditorUiContext);
}

export function useEditorUndo() {
  const context = use(EditorUndoContext);
  if (!context) {
    throw new Error("useEditorUndo must be used within an EditorProvider");
  }
  return context;
}

export function useEditorUndoOptional() {
  return use(EditorUndoContext);
}
