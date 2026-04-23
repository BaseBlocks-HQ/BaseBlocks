"use client";

import { createContext, use } from "react";

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

export const EditorUiContext = createContext<EditorUiContextValue | null>(null);

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
