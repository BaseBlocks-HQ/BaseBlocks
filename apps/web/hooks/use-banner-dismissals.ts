"use client";

import { useLocalStorage } from "@/hooks/use-local-storage";
import { useCallback } from "react";

const STORAGE_KEY = "baseblocks_dismissed_banners";

/**
 * Hook for tracking dismissed banner alerts in localStorage.
 */
export function useBannerDismissals() {
  const [dismissedIds, setDismissedIds] = useLocalStorage<string[]>(
    STORAGE_KEY,
    [],
  );

  const isDismissed = useCallback(
    (alertId: string) => dismissedIds.includes(alertId),
    [dismissedIds],
  );

  const dismiss = useCallback(
    (alertId: string) => {
      setDismissedIds((prev) =>
        prev.includes(alertId) ? prev : [...prev, alertId],
      );
    },
    [setDismissedIds],
  );

  const resetAll = useCallback(() => {
    setDismissedIds([]);
  }, [setDismissedIds]);

  return { isDismissed, dismiss, resetAll };
}
