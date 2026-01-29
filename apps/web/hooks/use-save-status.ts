import type { SaveStatus } from "@/types";
import { useCallback, useEffect, useRef, useState } from "react";

interface UseSaveStatusOptions {
  /** Duration to show "saved" status before returning to idle (ms) */
  savedDuration?: number;
}

/**
 * Manages save status state machine for debounced auto-save UX
 * States: idle → pending → saving → saved → idle
 */
export function useSaveStatus(options: UseSaveStatusOptions = {}) {
  const { savedDuration = 2000 } = options;
  const [status, setStatus] = useState<SaveStatus>("idle");
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-clear "saved" status after duration
  useEffect(() => {
    if (status === "saved") {
      timeoutRef.current = setTimeout(() => {
        setStatus("idle");
      }, savedDuration);
    }
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [status, savedDuration]);

  const markPending = useCallback(() => setStatus("pending"), []);
  const markSaving = useCallback(() => setStatus("saving"), []);
  const markSaved = useCallback(() => setStatus("saved"), []);
  const markIdle = useCallback(() => setStatus("idle"), []);

  return {
    status,
    setStatus,
    markPending,
    markSaving,
    markSaved,
    markIdle,
  };
}
