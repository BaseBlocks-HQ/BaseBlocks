"use client";

import { useSitePermissions } from "@/hooks";
import type { UndoCommand } from "@/lib/undo";
import { useUndoKeyboardShortcuts, useUndoManager } from "@/lib/undo";
import type { SubpageContent } from "@/types/elements/blocks";
import { api } from "@repo/backend";
import type { Id } from "@repo/backend";
import { useMutation, useQuery } from "convex/react";
import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useState,
} from "react";
import { toast } from "sonner";

export interface EditingSubpage {
  blockId: string;
  layoutId: string;
  slotId: string;
  content: SubpageContent;
}

interface EditorSelection {
  layoutId: string | null;
  slotId: string | null;
  blockId: string | null;
}

interface EditorContextValue {
  siteId: Id<"sites">;
  selection: EditorSelection;
  selectLayout: (layoutId: string | null) => void;
  selectSlot: (layoutId: string, slotId: string | null) => void;
  selectBlock: (
    layoutId: string,
    slotId: string,
    blockId: string | null,
  ) => void;
  clearSelection: () => void;
  // Subpage editing
  editingSubpage: EditingSubpage | null;
  openSubpageEditor: (subpage: EditingSubpage) => void;
  closeSubpageEditor: () => void;
  updateEditingSubpageContent: (content: SubpageContent) => void;
  // Permissions
  canEdit: boolean;
  isAdmin: boolean;
  isViewer: boolean;
  isPermissionsLoading: boolean;
  // Deploy tracking - derived from timestamps
  hasUndeployedChanges: boolean;
  deploySite: (notes?: string) => Promise<void>;
  // Page-level tabs
  activeTabId: string | null;
  setActiveTabId: (tabId: string | null) => void;
  // Undo/Redo
  currentPageId: string | null;
  setCurrentPageId: (pageId: string | null) => void;
  pushCommand: (cmd: Omit<UndoCommand, "id" | "timestamp">) => void;
  undo: (pageId?: string) => Promise<void>;
  redo: (pageId?: string) => Promise<void>;
  canUndo: (pageId?: string) => boolean;
  canRedo: (pageId?: string) => boolean;
  isUndoRedoExecuting: boolean;
}

const EditorContext = createContext<EditorContextValue | null>(null);

interface EditorProviderProps {
  siteId: Id<"sites">;
  children: ReactNode;
}

export function EditorProvider({ siteId, children }: EditorProviderProps) {
  const [selection, setSelection] = useState<EditorSelection>({
    layoutId: null,
    slotId: null,
    blockId: null,
  });
  const [editingSubpage, setEditingSubpage] = useState<EditingSubpage | null>(null);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [currentPageId, setCurrentPageId] = useState<string | null>(null);

  // Query the site to derive hasUndeployedChanges from timestamps
  const site = useQuery(api.sites.queries.get, { siteId });
  const hasUndeployedChanges = site
    ? (site.contentModifiedAt ?? 0) > (site.lastDeployedAt ?? 0)
    : false;

  // New deploy mutation
  const deployMutation = useMutation(api.deployments.mutations.deploy);

  // Get permissions for this site
  const {
    canEdit,
    isAdmin,
    isViewer,
    isLoading: isPermissionsLoading,
  } = useSitePermissions(siteId);

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
    currentPageId,
  });

  // Deploy site - calls the new deployments module
  const deploySite = useCallback(async (notes?: string) => {
    try {
      await deployMutation({ siteId, notes });
      toast.success("Changes deployed successfully");
    } catch (error) {
      console.error("Failed to deploy changes:", error);
      toast.error("Failed to deploy changes");
    }
  }, [deployMutation, siteId]);

  const selectLayout = useCallback((layoutId: string | null) => {
    setSelection({
      layoutId,
      slotId: null,
      blockId: null,
    });
  }, []);

  const selectSlot = useCallback((layoutId: string, slotId: string | null) => {
    setSelection({
      layoutId,
      slotId,
      blockId: null,
    });
  }, []);

  const selectBlock = useCallback(
    (layoutId: string, slotId: string, blockId: string | null) => {
      setSelection({
        layoutId,
        slotId,
        blockId,
      });
    },
    [],
  );

  const clearSelection = useCallback(() => {
    setSelection({
      layoutId: null,
      slotId: null,
      blockId: null,
    });
  }, []);

  const openSubpageEditor = useCallback((subpage: EditingSubpage) => {
    setEditingSubpage(subpage);
  }, []);

  const closeSubpageEditor = useCallback(() => {
    setEditingSubpage(null);
  }, []);

  const updateEditingSubpageContent = useCallback((content: SubpageContent) => {
    setEditingSubpage((prev) => prev ? { ...prev, content } : null);
  }, []);

  return (
    <EditorContext.Provider
      value={{
        siteId,
        selection,
        selectLayout,
        selectSlot,
        selectBlock,
        clearSelection,
        editingSubpage,
        openSubpageEditor,
        closeSubpageEditor,
        updateEditingSubpageContent,
        canEdit,
        isAdmin,
        isViewer,
        isPermissionsLoading,
        hasUndeployedChanges,
        deploySite,
        activeTabId,
        setActiveTabId,
        currentPageId,
        setCurrentPageId,
        pushCommand,
        undo,
        redo,
        canUndo,
        canRedo,
        isUndoRedoExecuting,
      }}
    >
      {children}
    </EditorContext.Provider>
  );
}

export function useEditorContext() {
  const context = useContext(EditorContext);
  if (!context) {
    throw new Error("useEditorContext must be used within an EditorProvider");
  }
  return context;
}

// Optional hook that returns null if not in editor context (for use in renderers)
export function useEditorContextOptional() {
  return useContext(EditorContext);
}
