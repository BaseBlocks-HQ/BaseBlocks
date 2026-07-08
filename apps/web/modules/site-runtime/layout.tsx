"use client";

import type {
  LayoutSettings,
  LayoutType,
  SpacerLayoutHeight,
} from "@baseblocks/domain";
import type { CSSProperties } from "react";
import { type ReactNode, createContext, use } from "react";

interface LayoutContextValue {
  layoutType: LayoutType;
  isSidebar: boolean;
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

export function useLayoutContext() {
  return use(LayoutContext);
}

export const SPACER_LAYOUT_HEIGHTS: Record<SpacerLayoutHeight, number> = {
  small: 32,
  medium: 64,
  large: 96,
  xlarge: 128,
};

export function getLayoutGridStyle(
  type: LayoutType,
  settings: LayoutSettings,
): CSSProperties {
  switch (type) {
    case "single":
      return { display: "block" };
    case "rows":
      return {
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
      };
    case "columns":
      return {
        display: "grid",
        gridTemplateColumns: `repeat(${settings.columnCount ?? 2}, minmax(0, 1fr))`,
        gap: "1.5rem",
      };
    case "grid":
      return {
        display: "grid",
        gridTemplateColumns: `repeat(${settings.gridColumns ?? 2}, minmax(0, 1fr))`,
        gap: "1rem",
      };
    case "vertical":
    case "spacer":
      return { display: "block" };
    default:
      return { display: "block" };
  }
}
