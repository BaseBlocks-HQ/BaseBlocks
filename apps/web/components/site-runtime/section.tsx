"use client";

import type { SectionRegion } from "@baseblocks/domain";
import { type ReactNode, createContext, use } from "react";

interface SectionContextValue {
  region: SectionRegion;
  isAside: boolean;
  sectionId: string;
}

const SectionContext = createContext<SectionContextValue | null>(null);

export function SectionContextProvider({
  children,
  region,
  sectionId,
}: {
  children: ReactNode;
  region: SectionRegion;
  sectionId: string;
}) {
  return (
    <SectionContext.Provider
      value={{
        region,
        isAside: region === "aside",
        sectionId,
      }}
    >
      {children}
    </SectionContext.Provider>
  );
}

export function useSectionContext() {
  return use(SectionContext);
}
