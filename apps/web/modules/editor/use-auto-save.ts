"use client";

import type { SaveStatus } from "@baseblocks/domain";
import { useDebounceCallbackWithFlush } from "@baseblocks/ui/hooks/use-debounce";
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
  onUpdate: (content: T) => void,
  onSaveStatusChange?: (status: SaveStatus) => void,
  delay = 500,
) {
  const { debouncedCallback } = useDebounceCallbackWithFlush(
    async (content: T) => {
      onSaveStatusChange?.("saving");
      try {
        await onUpdate(content);
        onSaveStatusChange?.("saved");
      } catch (_error) {
        toast.error("Failed to save changes");
        onSaveStatusChange?.("idle");
      }
    },
    delay,
  );

  return debouncedCallback;
}
