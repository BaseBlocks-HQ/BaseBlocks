"use client";

import type { Id } from "@baseblocks/backend";
import { type ReactNode, createContext, use } from "react";

export interface SiteRenderActions {
  siteId?: Id<"sites">;
  siteSlug?: string;
  teamSlug?: string;
  openPage?: (pageId: string, options?: { searchTerm?: string }) => void;
  publicSearch?: boolean;
  fileDeepLinks?: boolean;
}

const SiteRenderActionsContext = createContext<SiteRenderActions>({});

export function SiteRenderActionsProvider({
  actions,
  children,
}: {
  actions: SiteRenderActions;
  children: ReactNode;
}) {
  return (
    <SiteRenderActionsContext.Provider value={actions}>
      {children}
    </SiteRenderActionsContext.Provider>
  );
}

export function useSiteRenderActions() {
  return use(SiteRenderActionsContext);
}
