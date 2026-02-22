"use client";

import { useEffect } from "react";

interface UseUndoKeyboardShortcutsOptions {
  undo: (pageId?: string) => Promise<void>;
  redo: (pageId?: string) => Promise<void>;
  canUndo: (pageId?: string) => boolean;
  canRedo: (pageId?: string) => boolean;
  canEdit: boolean;
  currentPageId: string | null;
}

export function useUndoKeyboardShortcuts({
  undo,
  redo,
  canUndo,
  canRedo,
  canEdit,
  currentPageId,
}: UseUndoKeyboardShortcutsOptions) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!canEdit) return;

      const target = e.target as HTMLElement;
      const tagName = target.tagName.toLowerCase();
      // Skip native input/textarea elements but NOT contenteditable
      if (tagName === "input" || tagName === "textarea") return;

      const isMod = e.metaKey || e.ctrlKey;
      if (!isMod) return;

      if (e.key === "z" && !e.shiftKey) {
        // Undo: try page stack first, then site stack
        e.preventDefault();
        if (currentPageId && canUndo(currentPageId)) {
          undo(currentPageId);
        } else if (canUndo()) {
          undo();
        }
      } else if (
        (e.key === "z" && e.shiftKey) ||
        (e.key === "y" && !e.shiftKey)
      ) {
        // Redo: try page stack first, then site stack
        e.preventDefault();
        if (currentPageId && canRedo(currentPageId)) {
          redo(currentPageId);
        } else if (canRedo()) {
          redo();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [undo, redo, canUndo, canRedo, canEdit, currentPageId]);
}
