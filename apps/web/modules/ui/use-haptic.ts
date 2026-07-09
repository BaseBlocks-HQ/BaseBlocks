"use client";

import { useCallback } from "react";
import { useWebHaptics } from "web-haptics/react";

type HapticType =
  | "success"
  | "warning"
  | "error"
  | "light"
  | "medium"
  | "heavy"
  | "selection"
  | "soft"
  | "rigid"
  | "nudge"
  | "buzz";

// (pointer: coarse) is true on touch-only devices (phones, tablets).
// It is false on desktop, even with a touchscreen + mouse.
function isTouchDevice(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(pointer: coarse)").matches;
}

/**
 * Mobile-only haptic feedback hook.
 * Silently no-ops on desktop — only fires on touch devices.
 */
export function useHaptic() {
  const haptic = useWebHaptics();

  const trigger = useCallback(
    (type?: HapticType) => {
      if (isTouchDevice()) {
        haptic.trigger(type);
      }
    },
    [haptic],
  );

  return { trigger };
}
