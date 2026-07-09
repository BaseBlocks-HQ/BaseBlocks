"use client";

import { buildPathWithUpdatedSearchParams } from "@/modules/routing/search-params";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export interface ViewingPage {
  pageId: string;
  searchTerm?: string;
}

export function usePagePanelState() {
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

  return { viewingPage, openPage, closePage };
}
