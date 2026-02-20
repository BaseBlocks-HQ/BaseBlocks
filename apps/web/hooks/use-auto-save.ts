"use client";

import type { SaveStatus } from "@baseblocks/types";
import { useDebounceCallback } from "@baseblocks/ui/hooks/use-debounce";
import { useCallback } from "react";
import { toast } from "sonner";

/**
 * Shared auto-save hook for element editors.
 *
 * Debounces content updates and manages save status transitions:
 * idle → pending → saving → saved (or idle on error).
 *
 * Usage:
 * ```ts
 * const save = useAutoSave(onUpdate, onSaveStatusChange);
 * // In onChange handler:
 * onSaveStatusChange?.("pending");
 * save(newContent);
 * ```
 */
export function useAutoSave<T>(
  onUpdate: (content: T) => Promise<unknown> | void,
  onSaveStatusChange?: (status: SaveStatus) => void,
  delay = 500,
) {
  return useDebounceCallback(
    useCallback(
      async (content: T) => {
        onSaveStatusChange?.("saving");
        try {
          await onUpdate(content);
          onSaveStatusChange?.("saved");
        } catch (error) {
          console.error("Failed to save:", error);
          toast.error("Failed to save changes");
          onSaveStatusChange?.("idle");
        }
      },
      [onUpdate, onSaveStatusChange],
    ),
    delay,
  );
}
