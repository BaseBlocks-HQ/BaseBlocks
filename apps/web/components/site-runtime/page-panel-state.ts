"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

function buildPagePanelPath(
  pathname: string,
  currentSearchParams: string,
  panelPage: string | null,
  panelSearch: string | null,
) {
  const params = new URLSearchParams(currentSearchParams);

  if (panelPage) params.set("panelPage", panelPage);
  else params.delete("panelPage");

  if (panelSearch) params.set("panelSearch", panelSearch);
  else params.delete("panelSearch");

  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function usePagePanelState() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const openPage = (pageId: string, options?: { searchTerm?: string }) => {
    const trimmedSearchTerm = options?.searchTerm?.trim();
    const nextUrl = buildPagePanelPath(
      pathname,
      searchParams.toString(),
      pageId,
      trimmedSearchTerm || null,
    );

    router.replace(nextUrl, { scroll: false });
  };

  const closePage = () => {
    const nextUrl = buildPagePanelPath(
      pathname,
      searchParams.toString(),
      null,
      null,
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
