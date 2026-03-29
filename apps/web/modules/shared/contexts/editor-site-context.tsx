"use client";

import { createContext, use } from "react";

export interface EditorSiteContextValue {
  siteId: string;
  canEdit: boolean;
  isAdmin: boolean;
  isPermissionsLoading: boolean;
  hasUndeployedChanges: boolean;
}

export const EditorSiteContext = createContext<EditorSiteContextValue | null>(
  null,
);

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
