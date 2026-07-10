"use client";

import {
  type ReactNode,
  createContext,
  use,
  useCallback,
  useMemo,
  useState,
} from "react";

interface EditorPermissions {
  canEdit: boolean;
  isAdmin: boolean;
  isLoading: boolean;
}

export type EditorSelection =
  | { kind: "section"; id: string }
  | { kind: "column"; id: string }
  | { kind: "block"; id: string; columnId: string }
  | null;

export interface EditorUiContextValue {
  selection: EditorSelection;
  selectSection: (sectionId: string) => void;
  selectColumn: (columnId: string) => void;
  selectBlock: (blockId: string, columnId: string) => void;
  clearSelection: () => void;
  activeTabId: string | null;
  setActiveTabId: (tabId: string | null) => void;
  openPage: (pageId: string) => void;
}

export interface EditorSiteContextValue {
  siteId: string;
  canEdit: boolean;
  isAdmin: boolean;
  isPermissionsLoading: boolean;
}

const EditorUiContext = createContext<EditorUiContextValue | null>(null);
const EditorSiteContext = createContext<EditorSiteContextValue | null>(null);

interface EditorProviderProps {
  siteId: string;
  permissions: EditorPermissions;
  onOpenPage: (pageId: string) => void;
  children: ReactNode;
}

export function EditorProvider({
  siteId,
  permissions,
  onOpenPage,
  children,
}: EditorProviderProps) {
  const [selection, setSelection] = useState<EditorSelection>(null);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);

  const { canEdit, isAdmin, isLoading: isPermissionsLoading } = permissions;

  const selectSection = useCallback(
    (id: string) => setSelection({ kind: "section", id }),
    [],
  );
  const selectColumn = useCallback(
    (id: string) => setSelection({ kind: "column", id }),
    [],
  );
  const selectBlock = useCallback(
    (id: string, columnId: string) =>
      setSelection({ kind: "block", id, columnId }),
    [],
  );
  const clearSelection = useCallback(() => setSelection(null), []);
  const openPage = useCallback(
    (pageId: string) => {
      setSelection(null);
      setActiveTabId(null);
      onOpenPage(pageId);
    },
    [onOpenPage],
  );

  const uiValue = useMemo<EditorUiContextValue>(
    () => ({
      selection,
      selectSection,
      selectColumn,
      selectBlock,
      clearSelection,
      activeTabId,
      setActiveTabId,
      openPage,
    }),
    [
      activeTabId,
      clearSelection,
      openPage,
      selectBlock,
      selectColumn,
      selectSection,
      selection,
    ],
  );

  return (
    <EditorSiteContext.Provider
      value={{
        siteId,
        canEdit,
        isAdmin,
        isPermissionsLoading,
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
