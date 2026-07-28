"use client";

import type { Id } from "@baseblocks/backend";
import type { LibraryExplorerPayload } from "@/features/libraries/model";
import { type ReactNode, createContext, use } from "react";

export interface SiteRenderActions {
  siteId?: Id<"sites">;
  siteSlug?: string;
  openPage?: (pageId: string) => void;
  publicSearch?: boolean;
  publicLibraries?: Readonly<Record<string, LibraryExplorerPayload>>;
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
