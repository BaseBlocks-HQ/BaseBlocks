"use client";

import type { Id } from "@repo/backend";
import { type ReactNode, createContext, useContext } from "react";

interface PublicSiteContextValue {
  siteId: Id<"sites">;
  siteSlug: string;
  companySlug: string;
}

const PublicSiteContext = createContext<PublicSiteContextValue | null>(null);

export function PublicSiteProvider({
  children,
  siteId,
  siteSlug,
  companySlug,
}: {
  children: ReactNode;
  siteId: Id<"sites">;
  siteSlug: string;
  companySlug: string;
}) {
  return (
    <PublicSiteContext.Provider value={{ siteId, siteSlug, companySlug }}>
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
