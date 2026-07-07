"use client";

import type { EditorPermissions, SiteData } from "@/modules/editor/app/types";
import type { LayoutSettings } from "@baseblocks/domain";
import { type ReactNode, createContext, use, useState } from "react";
import type { UndoCommand } from "./undo";
import { useUndoKeyboardShortcuts, useUndoManager } from "./undo";

export interface EditingPagePanel {
  pageId: string;
}

export interface EditorSelection {
  layoutId: string | null;
  slotId: string | null;
  blockId: string | null;
}

export interface EditorUiContextValue {
  selection: EditorSelection;
  selectLayout: (layoutId: string | null) => void;
  selectSlot: (layoutId: string, slotId: string | null) => void;
  selectBlock: (
    layoutId: string,
    slotId: string,
    blockId: string | null,
  ) => void;
  clearSelection: () => void;
  editingPage: EditingPagePanel | null;
  openPageEditor: (page: EditingPagePanel) => void;
  closePageEditor: () => void;
  activeTabId: string | null;
  setActiveTabId: (tabId: string | null) => void;
  currentPageId: string | null;
  setCurrentPageId: (pageId: string | null) => void;
}

export interface EditorSiteContextValue {
  siteId: string;
  canEdit: boolean;
  isAdmin: boolean;
  isPermissionsLoading: boolean;
  hasUndeployedChanges: boolean;
}

export interface EditorUndoContextValue {
  pushCommand: (cmd: Omit<UndoCommand, "id" | "timestamp">) => void;
  undo: (pageId?: string) => Promise<void>;
  redo: (pageId?: string) => Promise<void>;
  canUndo: (pageId?: string) => boolean;
  canRedo: (pageId?: string) => boolean;
  isUndoRedoExecuting: boolean;
}

export interface EditorMutations {
  layouts: {
    create: (args: {
      pageId: string;
      type: string;
      slots: {
        id: string;
        position: number;
        blocks: { id: string; type: string; content: unknown }[];
      }[];
      settings: LayoutSettings;
      tabId?: string;
    }) => Promise<string>;
    remove: (args: { layoutId: string }) => Promise<void>;
    reorder: (args: { pageId: string; layoutIds: string[] }) => Promise<void>;
    updateBlockInSlot: (args: {
      layoutId: string;
      slotId: string;
      blockId: string;
      content: unknown;
    }) => Promise<void>;
    removeBlockFromSlot: (args: {
      layoutId: string;
      slotId: string;
      blockId: string;
    }) => Promise<void>;
    addBlockToSlot: (args: {
      layoutId: string;
      slotId: string;
      block: { id: string; type: string; content: unknown };
      index?: number;
    }) => Promise<void>;
    moveBlock: (args: {
      layoutId: string;
      fromSlotId: string;
      toSlotId: string;
      blockId: string;
      toIndex: number;
    }) => Promise<void>;
    updateSettings: (args: {
      layoutId: string;
      settings: LayoutSettings;
    }) => Promise<void>;
  };
  pages: {
    updatePageTabs: (args: {
      pageId: string;
      pageTabs: { id: string; label: string }[];
    }) => Promise<void>;
    disablePageTabs: (args: { pageId: string }) => Promise<void>;
    enablePageTabs: (args: {
      pageId: string;
      tabs: { id: string; label: string }[];
    }) => Promise<void>;
    update: (args: { pageId: string; title: string }) => Promise<void>;
  };
}

const EditorUiContext = createContext<EditorUiContextValue | null>(null);
const EditorSiteContext = createContext<EditorSiteContextValue | null>(null);
const EditorUndoContext = createContext<EditorUndoContextValue | null>(null);
const EditorMutationsContext = createContext<EditorMutations | null>(null);

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
      setSelection({ layoutId, slotId: null, blockId: null }),
    selectSlot: (layoutId, slotId) =>
      setSelection({ layoutId, slotId, blockId: null }),
    selectBlock: (layoutId, slotId, blockId) =>
      setSelection({ layoutId, slotId, blockId }),
    clearSelection: () =>
      setSelection({ layoutId: null, slotId: null, blockId: null }),
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
      setUiState((current) => ({ ...current, activeTabId })),
    currentPageId: uiState.currentPageId,
    setCurrentPageId: (currentPageId) =>
      setUiState((current) => ({ ...current, currentPageId })),
  };

  return (
    <EditorSiteContext.Provider
      value={{
        siteId,
        canEdit,
        isAdmin,
        isPermissionsLoading,
        hasUndeployedChanges,
      }}
    >
      <EditorUiContext.Provider value={uiValue}>
        <EditorUndoContext.Provider
          value={{
            pushCommand,
            undo,
            redo,
            canUndo,
            canRedo,
            isUndoRedoExecuting,
          }}
        >
          {children}
        </EditorUndoContext.Provider>
      </EditorUiContext.Provider>
    </EditorSiteContext.Provider>
  );
}

export function EditorMutationsProvider({
  mutations,
  children,
}: {
  mutations: EditorMutations;
  children: ReactNode;
}) {
  return (
    <EditorMutationsContext.Provider value={mutations}>
      {children}
    </EditorMutationsContext.Provider>
  );
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

export function useEditorMutations(): EditorMutations {
  const context = use(EditorMutationsContext);
  if (!context) {
    throw new Error(
      "useEditorMutations must be used within an EditorMutationsProvider",
    );
  }
  return context;
}
