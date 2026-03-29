"use client";

import type { UndoCommand } from "@/modules/shared/undo";
import { createContext, use } from "react";

export interface EditorUndoContextValue {
  pushCommand: (cmd: Omit<UndoCommand, "id" | "timestamp">) => void;
  undo: (pageId?: string) => Promise<void>;
  redo: (pageId?: string) => Promise<void>;
  canUndo: (pageId?: string) => boolean;
  canRedo: (pageId?: string) => boolean;
  isUndoRedoExecuting: boolean;
}

export const EditorUndoContext = createContext<EditorUndoContextValue | null>(
  null,
);

export function useEditorUndo() {
  const context = use(EditorUndoContext);
  if (!context) {
    throw new Error("useEditorUndo must be used within an EditorProvider");
  }
  return context;
}

export function useEditorUndoOptional() {
  return use(EditorUndoContext);
}
