"use client";

import type { Id } from "@baseblocks/backend";
import { type ReactNode, createContext, useContext } from "react";

interface PublicSiteContextValue {
  siteId: Id<"sites">;
  siteSlug: string;
  teamSlug: string;
}

const PublicSiteContext = createContext<PublicSiteContextValue | null>(null);

export function PublicSiteProvider({
  children,
  siteId,
  siteSlug,
  teamSlug,
}: {
  children: ReactNode;
  siteId: Id<"sites">;
  siteSlug: string;
  teamSlug: string;
}) {
  return (
    <PublicSiteContext.Provider value={{ siteId, siteSlug, teamSlug }}>
      {children}
    </PublicSiteContext.Provider>
  );
}

export function usePublicSiteContext() {
  const context = useContext(PublicSiteContext);
  if (!context) {
    throw new Error(
      "usePublicSiteContext must be used within PublicSiteProvider",
    );
  }
  return context;
}

export function usePublicSiteContextOptional() {
  return useContext(PublicSiteContext);
}
