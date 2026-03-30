"use client";

import { useHaptic } from "@/lib/use-haptic";
import { useEffect } from "react";

/**
 * Renders nothing — adds event delegation on the document to fire a haptic
 * whenever a link inside the fumadocs sidebar (aside element) is tapped.
 */
export function DocsSidebarHaptics() {
  const haptic = useHaptic();

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest("a");
      if (!link) return;

      // Fumadocs renders the sidebar inside an <aside> element
      if (!link.closest("aside")) return;

      haptic.trigger("heavy");
    };

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [haptic]);

  return null;
}
