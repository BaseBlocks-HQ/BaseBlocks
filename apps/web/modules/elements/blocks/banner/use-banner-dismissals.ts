"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "baseblocks_dismissed_banners";

export function useBannerDismissals() {
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);

  useEffect(() => {
    try {
      const item = localStorage.getItem(STORAGE_KEY);
      if (item) setDismissedIds(JSON.parse(item));
    } catch {}
  }, []);

  const isDismissed = (alertId: string) => dismissedIds.includes(alertId);

  const dismiss = (alertId: string) => {
    setDismissedIds((prev) => {
      if (prev.includes(alertId)) return prev;
      const next = [...prev, alertId];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const resetAll = () => {
    setDismissedIds([]);
    localStorage.setItem(STORAGE_KEY, "[]");
  };

  return { isDismissed, dismiss, resetAll };
}
