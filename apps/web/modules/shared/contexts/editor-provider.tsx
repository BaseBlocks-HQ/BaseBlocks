"use client";

import type { EditorPermissions, SiteData } from "@/modules/shared/types";
import {
  useUndoKeyboardShortcuts,
  useUndoManager,
} from "@/modules/shared/undo";
import { type ReactNode, useState } from "react";
import {
  EditorSiteContext,
  type EditorSiteContextValue,
} from "./editor-site-context";
import {
  type EditingPagePanel,
  type EditorSelection,
  EditorUiContext,
  type EditorUiContextValue,
} from "./editor-ui-context";
import {
  EditorUndoContext,
  type EditorUndoContextValue,
} from "./editor-undo-context";

interface EditorProviderProps {
  siteId: string;
  site?: SiteData;
  permissions: EditorPermissions;
  pagePanelState?: Pick<
    EditorUiContextValue,
    "editingPage" | "openPageEditor" | "closePageEditor"
  >;
  children: ReactNode;
}

export function EditorProvider({
  siteId,
  site,
  permissions,
  pagePanelState,
  children,
}: EditorProviderProps) {
  const [selection, setSelection] = useState<EditorSelection>({
    layoutId: null,
    slotId: null,
    blockId: null,
  });
  const [editingPage, setEditingPage] = useState<EditingPagePanel | null>(null);
  const [uiState, setUiState] = useState({
    activeTabId: null as string | null,
    currentPageId: null as string | null,
  });

  const hasUndeployedChanges = site
    ? (site.contentModifiedAt ?? 0) > (site.lastDeployedAt ?? 0)
    : false;

  const { canEdit, isAdmin, isLoading: isPermissionsLoading } = permissions;

  const {
    pushCommand,
    undo,
    redo,
    canUndo,
    canRedo,
    isExecuting: isUndoRedoExecuting,
  } = useUndoManager();

  useUndoKeyboardShortcuts({
    undo,
    redo,
    canUndo,
    canRedo,
    canEdit,
    currentPageId: uiState.currentPageId,
  });

  const uiValue: EditorUiContextValue = {
    selection,
    selectLayout: (layoutId) =>
      setSelection({
        layoutId,
        slotId: null,
        blockId: null,
      }),
    selectSlot: (layoutId, slotId) =>
      setSelection({
        layoutId,
        slotId,
        blockId: null,
      }),
    selectBlock: (layoutId, slotId, blockId) =>
      setSelection({
        layoutId,
        slotId,
        blockId,
      }),
    clearSelection: () =>
      setSelection({
        layoutId: null,
        slotId: null,
        blockId: null,
      }),
    editingPage: pagePanelState?.editingPage ?? editingPage,
    openPageEditor:
      pagePanelState?.openPageEditor ??
      ((page) => {
        setEditingPage(page);
      }),
    closePageEditor:
      pagePanelState?.closePageEditor ??
      (() => {
        setEditingPage(null);
      }),
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
  };

  const siteValue: EditorSiteContextValue = {
    siteId,
    canEdit,
    isAdmin,
    isPermissionsLoading,
    hasUndeployedChanges,
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
