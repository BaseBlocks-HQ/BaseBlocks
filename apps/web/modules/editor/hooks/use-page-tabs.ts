"use client";

import { useEditorContext } from "@/modules/shared/contexts/editor-context";
import { useEditorMutations } from "@/modules/shared/contexts/editor-mutations";
import { generateId } from "@/modules/shared/layouts";
import type { PageTab } from "@/modules/shared/types";
import { useRef, useState } from "react";

interface UsePageTabsArgs {
  pageId: string;
  pageTabs: PageTab[];
  activeTabId: string | null;
  setActiveTabId: (tabId: string | null) => void;
}

export function usePageTabs({
  pageId,
  pageTabs,
  activeTabId,
  setActiveTabId,
}: UsePageTabsArgs) {
  const { pushCommand, isUndoRedoExecuting } = useEditorContext();
  const { pages: pageMutations } = useEditorMutations();

  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState("");
  const tabInputRef = useRef<HTMLInputElement>(null);

  const handleDisableTabs = async () => {
    const oldTabs = structuredClone(pageTabs);

    await pageMutations.disablePageTabs({ pageId });
    setActiveTabId(null);

    if (!isUndoRedoExecuting && oldTabs.length > 0) {
      pushCommand({
        description: "Disable page tabs",
        pageId,
        undo: async () => {
          await pageMutations.enablePageTabs({ pageId, tabs: oldTabs });
        },
        redo: async () => {
          await pageMutations.disablePageTabs({ pageId });
          setActiveTabId(null);
        },
      });
    }
  };

  const handleAddTab = async () => {
    const oldTabs = structuredClone(pageTabs);
    const newTab = { id: generateId(), label: `Tab ${pageTabs.length + 1}` };
    const newTabs = [...pageTabs, newTab];

    await pageMutations.updatePageTabs({ pageId, pageTabs: newTabs });
    setActiveTabId(newTab.id);

    if (!isUndoRedoExecuting) {
      pushCommand({
        description: "Add tab",
        pageId,
        undo: async () => {
          await pageMutations.updatePageTabs({ pageId, pageTabs: oldTabs });
        },
        redo: async () => {
          await pageMutations.updatePageTabs({ pageId, pageTabs: newTabs });
          setActiveTabId(newTab.id);
        },
      });
    }
  };

  const handleRemoveTab = async (tabId: string) => {
    if (pageTabs.length <= 2) return;
    const oldTabs = structuredClone(pageTabs);
    const newTabs = pageTabs.filter((t) => t.id !== tabId);

    await pageMutations.updatePageTabs({ pageId, pageTabs: newTabs });
    if (activeTabId === tabId) {
      setActiveTabId(newTabs[0]?.id ?? null);
    }

    if (!isUndoRedoExecuting) {
      pushCommand({
        description: "Remove tab",
        pageId,
        undo: async () => {
          await pageMutations.updatePageTabs({ pageId, pageTabs: oldTabs });
        },
        redo: async () => {
          await pageMutations.updatePageTabs({ pageId, pageTabs: newTabs });
        },
      });
    }
  };

  const handleStartRenameTab = (tab: { id: string; label: string }) => {
    setEditingTabId(tab.id);
    setEditingLabel(tab.label);
    setTimeout(() => tabInputRef.current?.select(), 0);
  };

  const handleFinishRenameTab = async () => {
    if (!editingTabId) return;
    const oldTabs = structuredClone(pageTabs);
    const newTabs = pageTabs.map((t) =>
      t.id === editingTabId
        ? { ...t, label: editingLabel.trim() || t.label }
        : t,
    );
    await pageMutations.updatePageTabs({ pageId, pageTabs: newTabs });
    setEditingTabId(null);

    if (!isUndoRedoExecuting) {
      pushCommand({
        description: "Rename tab",
        pageId,
        undo: async () => {
          await pageMutations.updatePageTabs({ pageId, pageTabs: oldTabs });
        },
        redo: async () => {
          await pageMutations.updatePageTabs({ pageId, pageTabs: newTabs });
        },
      });
    }
  };

  return {
    editingTabId,
    editingLabel,
    setEditingLabel,
    setEditingTabId,
    tabInputRef,
    handleDisableTabs,
    handleAddTab,
    handleRemoveTab,
    handleStartRenameTab,
    handleFinishRenameTab,
  };
}
