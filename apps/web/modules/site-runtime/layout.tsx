"use client";

import { type ReactNode, createContext, use } from "react";

interface LayoutContextValue {
  isSidebar: boolean;
}

const LayoutContext = createContext<LayoutContextValue | null>(null);

export function LayoutContextProvider({
  children,
  isSidebar = false,
}: {
  children: ReactNode;
  isSidebar?: boolean;
}) {
  return (
    <LayoutContext.Provider value={{ isSidebar }}>
      {children}
    </LayoutContext.Provider>
  );
}

export function useLayoutContext() {
  return use(LayoutContext);
}
