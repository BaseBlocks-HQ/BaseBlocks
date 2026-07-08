"use client";

import { type ReactNode, createContext, use, useState } from "react";

interface EditorPermissions {
  canEdit: boolean;
  isAdmin: boolean;
  isLoading: boolean;
}

interface SiteData {
  contentModifiedAt?: number;
  lastDeployedAt?: number;
}

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

const EditorUiContext = createContext<EditorUiContextValue | null>(null);
const EditorSiteContext = createContext<EditorSiteContextValue | null>(null);

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
        {children}
      </EditorUiContext.Provider>
    </EditorSiteContext.Provider>
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
