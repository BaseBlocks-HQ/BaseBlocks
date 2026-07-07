"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import type { UndoCommand, UndoStack } from "./types";

const MAX_PAGE_STACK = 50;
const MAX_SITE_STACK = 20;

let commandCounter = 0;
function nextCommandId() {
  return `cmd_${Date.now()}_${++commandCounter}`;
}

function createEmptyStack(): UndoStack {
  return { undoStack: [], redoStack: [] };
}

export function useUndoManager() {
  const pageStacksRef = useRef<Map<string, UndoStack>>(new Map());
  const siteStackRef = useRef<UndoStack>(createEmptyStack());
  const [isExecuting, setIsExecuting] = useState(false);
  // Bump this to trigger re-renders when stacks change
  const [, setRevision] = useState(0);
  const bump = () => setRevision((r) => r + 1);

  const getPageStack = (pageId: string): UndoStack => {
    let stack = pageStacksRef.current.get(pageId);
    if (!stack) {
      stack = createEmptyStack();
      pageStacksRef.current.set(pageId, stack);
    }
    return stack;
  };

  const pushCommand = (cmd: Omit<UndoCommand, "id" | "timestamp">) => {
    const command: UndoCommand = {
      ...cmd,
      id: nextCommandId(),
      timestamp: Date.now(),
    };

    if (command.pageId) {
      const stack = getPageStack(command.pageId);
      stack.undoStack.push(command);
      if (stack.undoStack.length > MAX_PAGE_STACK) {
        stack.undoStack.shift();
      }
      stack.redoStack = [];
    } else {
      siteStackRef.current.undoStack.push(command);
      if (siteStackRef.current.undoStack.length > MAX_SITE_STACK) {
        siteStackRef.current.undoStack.shift();
      }
      siteStackRef.current.redoStack = [];
    }
    bump();
  };

  const undo = async (pageId?: string) => {
    if (isExecuting) return;

    const stack = pageId ? getPageStack(pageId) : siteStackRef.current;
    const command = stack.undoStack.pop();
    if (!command) return;

    setIsExecuting(true);
    try {
      await command.undo();
      stack.redoStack.push(command);
      bump();
    } catch (_error) {
      toast.error("Undo failed");
      // Discard the failed command (don't push back)
      bump();
    } finally {
      setIsExecuting(false);
    }
  };

  const redo = async (pageId?: string) => {
    if (isExecuting) return;

    const stack = pageId ? getPageStack(pageId) : siteStackRef.current;
    const command = stack.redoStack.pop();
    if (!command) return;

    setIsExecuting(true);
    try {
      await command.redo();
      stack.undoStack.push(command);
      bump();
    } catch (_error) {
      toast.error("Redo failed");
      bump();
    } finally {
      setIsExecuting(false);
    }
  };

  const canUndo = (pageId?: string): boolean => {
    const stack = pageId ? getPageStack(pageId) : siteStackRef.current;
    return stack.undoStack.length > 0;
  };

  const canRedo = (pageId?: string): boolean => {
    const stack = pageId ? getPageStack(pageId) : siteStackRef.current;
    return stack.redoStack.length > 0;
  };

  const clearPageStack = (pageId: string) => {
    pageStacksRef.current.delete(pageId);
    bump();
  };

  return {
    pushCommand,
    undo,
    redo,
    canUndo,
    canRedo,
    clearPageStack,
    isExecuting,
  };
}
