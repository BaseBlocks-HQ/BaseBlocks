"use client";

import { useSitePermissions } from "@/hooks";
import type { Id } from "@repo/backend";
import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useState,
} from "react";

interface EditorSelection {
  sectionId: string | null;
  slotId: string | null;
  blockId: string | null;
}

interface EditorContextValue {
  siteId: Id<"sites">;
  selection: EditorSelection;
  selectSection: (sectionId: string | null) => void;
  selectSlot: (sectionId: string, slotId: string | null) => void;
  selectBlock: (
    sectionId: string,
    slotId: string,
    blockId: string | null,
  ) => void;
  clearSelection: () => void;
  // Permissions
  canEdit: boolean;
  isAdmin: boolean;
  isViewer: boolean;
  isPermissionsLoading: boolean;
}

const EditorContext = createContext<EditorContextValue | null>(null);

interface EditorProviderProps {
  siteId: Id<"sites">;
  children: ReactNode;
}

export function EditorProvider({ siteId, children }: EditorProviderProps) {
  const [selection, setSelection] = useState<EditorSelection>({
    sectionId: null,
    slotId: null,
    blockId: null,
  });

  // Get permissions for this site
  const { canEdit, isAdmin, isViewer, isLoading: isPermissionsLoading } =
    useSitePermissions(siteId);

  const selectSection = useCallback((sectionId: string | null) => {
    setSelection({
      sectionId,
      slotId: null,
      blockId: null,
    });
  }, []);

  const selectSlot = useCallback((sectionId: string, slotId: string | null) => {
    setSelection({
      sectionId,
      slotId,
      blockId: null,
    });
  }, []);

  const selectBlock = useCallback(
    (sectionId: string, slotId: string, blockId: string | null) => {
      setSelection({
        sectionId,
        slotId,
        blockId,
      });
    },
    [],
  );

  const clearSelection = useCallback(() => {
    setSelection({
      sectionId: null,
      slotId: null,
      blockId: null,
    });
  }, []);

  return (
    <EditorContext.Provider
      value={{
        siteId,
        selection,
        selectSection,
        selectSlot,
        selectBlock,
        clearSelection,
        canEdit,
        isAdmin,
        isViewer,
        isPermissionsLoading,
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
