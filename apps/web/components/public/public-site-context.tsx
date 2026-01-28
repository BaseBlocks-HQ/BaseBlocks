"use client";

import { createContext, useContext, type ReactNode } from "react";

interface PublicSiteContextValue {
  siteId: string;
  companySlug: string;
}

const PublicSiteContext = createContext<PublicSiteContextValue | null>(null);

export function PublicSiteProvider({
  children,
  siteId,
  companySlug,
}: {
  children: ReactNode;
  siteId: string;
  companySlug: string;
}) {
  return (
    <PublicSiteContext.Provider value={{ siteId, companySlug }}>
      {children}
    </PublicSiteContext.Provider>
  );
}

export function usePublicSiteContext() {
  const context = useContext(PublicSiteContext);
  if (!context) {
    throw new Error("usePublicSiteContext must be used within PublicSiteProvider");
  }
  return context;
}

export function usePublicSiteContextOptional() {
  return useContext(PublicSiteContext);
}
