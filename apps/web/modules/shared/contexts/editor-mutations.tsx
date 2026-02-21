"use client";

import type { LayoutSettings } from "@baseblocks/types";
import { type ReactNode, createContext, useContext } from "react";

/** All mutation functions the editor needs, grouped by domain */
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

const EditorMutationsContext = createContext<EditorMutations | null>(null);

interface EditorMutationsProviderProps {
  mutations: EditorMutations;
  children: ReactNode;
}

export function EditorMutationsProvider({
  mutations,
  children,
}: EditorMutationsProviderProps) {
  return (
    <EditorMutationsContext.Provider value={mutations}>
      {children}
    </EditorMutationsContext.Provider>
  );
}

export function useEditorMutations(): EditorMutations {
  const context = useContext(EditorMutationsContext);
  if (!context) {
    throw new Error(
      "useEditorMutations must be used within an EditorMutationsProvider",
    );
  }
  return context;
}
