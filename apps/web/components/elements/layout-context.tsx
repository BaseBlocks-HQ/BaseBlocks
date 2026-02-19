"use client";

import type { LayoutType } from "@repo/types";
import { type ReactNode, createContext, useContext } from "react";

export interface LayoutContextValue {
  layoutType: LayoutType;
  isSidebar: boolean; // Convenience: true if layoutType === "vertical"
  layoutId?: string;
  slotPosition?: number;
}

const LayoutContext = createContext<LayoutContextValue | null>(null);

export function LayoutContextProvider({
  children,
  layoutType,
  layoutId,
  slotPosition,
}: {
  children: ReactNode;
  layoutType: LayoutType;
  layoutId?: string;
  slotPosition?: number;
}) {
  return (
    <LayoutContext.Provider
      value={{
        layoutType,
        isSidebar: layoutType === "vertical",
        layoutId,
        slotPosition,
      }}
    >
      {children}
    </LayoutContext.Provider>
  );
}

// Returns null if not in context (safe for elements that don't need it)
export function useLayoutContext() {
  return useContext(LayoutContext);
}
