"use client";

import { type ReactNode, createContext, use } from "react";

interface EditorPermissions {
  canEdit: boolean;
  isAdmin: boolean;
  isLoading: boolean;
}

interface EditorUiContextValue {
  canGoBack: boolean;
  goBack: () => void;
  openPage: (pageId: string) => void;
  resetPageHistory: () => void;
  selectPage: (pageId: string) => void;
}

interface EditorSiteContextValue {
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
  canGoBack: boolean;
  onGoBack: () => void;
  onOpenPage: (pageId: string) => void;
  onResetPageHistory: () => void;
  onSelectPage: (pageId: string) => void;
  children: ReactNode;
}

export function EditorProvider({
  siteId,
  permissions,
  canGoBack,
  onGoBack,
  onOpenPage,
  onResetPageHistory,
  onSelectPage,
  children,
}: EditorProviderProps) {
  const { canEdit, isAdmin, isLoading: isPermissionsLoading } = permissions;

  const uiValue: EditorUiContextValue = {
    canGoBack,
    goBack: onGoBack,
    openPage: onOpenPage,
    resetPageHistory: onResetPageHistory,
    selectPage: onSelectPage,
  };
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
