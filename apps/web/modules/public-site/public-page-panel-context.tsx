"use client";

import { buildPathWithUpdatedSearchParams } from "@/lib/url-search-params";
import {
  type ReactNode,
  createContext,
  use,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

interface ViewingPage {
  pageId: string;
  searchTerm?: string;
}

interface PublicPagePanelContextValue {
  viewingPage: ViewingPage | null;
  openPage: (pageId: string, options?: { searchTerm?: string }) => void;
  closePage: () => void;
}

const PublicPagePanelContext =
  createContext<PublicPagePanelContextValue | null>(null);

interface PublicPagePanelProviderProps {
  children: ReactNode;
}

export function PublicPagePanelProvider({
  children,
}: PublicPagePanelProviderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const openPage = (pageId: string, options?: { searchTerm?: string }) => {
    const trimmedSearchTerm = options?.searchTerm?.trim();
    const nextUrl = buildPathWithUpdatedSearchParams(
      pathname,
      searchParams.toString(),
      {
        panelPage: pageId,
        panelSearch: trimmedSearchTerm || null,
      },
    );

    router.replace(nextUrl, { scroll: false });
  };

  const closePage = () => {
    const nextUrl = buildPathWithUpdatedSearchParams(
      pathname,
      searchParams.toString(),
      {
        panelPage: null,
        panelSearch: null,
      },
    );

    router.replace(nextUrl, { scroll: false });
  };

  const panelPageId = searchParams.get("panelPage");
  const panelSearch = searchParams.get("panelSearch")?.trim();
  const viewingPage = panelPageId
    ? {
        pageId: panelPageId,
        searchTerm: panelSearch || undefined,
      }
    : null;

  return (
    <PublicPagePanelContext.Provider
      value={{
        viewingPage,
        openPage,
        closePage,
      }}
    >
      {children}
    </PublicPagePanelContext.Provider>
  );
}

export function usePublicPagePanel() {
  const context = use(PublicPagePanelContext);
  if (!context) {
    throw new Error(
      "usePublicPagePanel must be used within a PublicPagePanelProvider",
    );
  }
  return context;
}

export function usePublicPagePanelOptional() {
  return use(PublicPagePanelContext);
}
