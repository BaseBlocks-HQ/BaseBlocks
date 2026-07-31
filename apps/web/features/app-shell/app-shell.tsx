"use client";

import { useTeamAccess } from "@/features/authentication/team-access";
import { EditorProvider } from "@/features/editor/editor-state";
import { SidebarInset, SidebarProvider } from "@baseblocks/ui/sidebar";
import { useParams, usePathname, useRouter } from "next/navigation";
import { type ReactNode, useState } from "react";
import { AppHeaderProvider } from "./app-header";
import { AppSidebar } from "./app-sidebar";

function buildAppPath(
  pathname: string,
  currentSearchParams: string,
  updates: Record<string, string | null>,
) {
  const params = new URLSearchParams(currentSearchParams);

  for (const [key, value] of Object.entries(updates)) {
    if (value) params.set(key, value);
    else params.delete(key);
  }

  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function AppShell({ children }: { children: ReactNode }) {
  const { capabilities } = useTeamAccess();
  const params = useParams<{ siteId?: string }>();
  const pathname = usePathname();
  const router = useRouter();
  const siteId = typeof params.siteId === "string" ? params.siteId : null;
  const [historyState, setHistoryState] = useState<{
    siteId: string | null;
    pages: (string | null)[];
  }>({ siteId, pages: [] });
  const pageHistory = historyState.siteId === siteId ? historyState.pages : [];

  const replaceEditorUrl = (pageId: string | null) => {
    const currentSearchParams =
      typeof window === "undefined" ? "" : window.location.search.slice(1);
    router.replace(
      buildAppPath(pathname, currentSearchParams, { page: pageId }),
      { scroll: false },
    );
  };

  const openPage = (pageId: string) => {
    const currentPageId =
      typeof window === "undefined"
        ? null
        : new URLSearchParams(window.location.search).get("page");
    if (currentPageId === pageId) return;
    setHistoryState((current) => ({
      siteId,
      pages:
        current.siteId === siteId
          ? [...current.pages, currentPageId]
          : [currentPageId],
    }));
    replaceEditorUrl(pageId);
  };

  const selectPage = (pageId: string) => {
    setHistoryState({ siteId, pages: [] });
    replaceEditorUrl(pageId);
  };

  const goBack = () => {
    if (pageHistory.length === 0) return;
    const previousPageId = pageHistory.at(-1) ?? null;
    setHistoryState({ siteId, pages: pageHistory.slice(0, -1) });
    replaceEditorUrl(previousPageId);
  };

  return (
    <SidebarProvider className="brand-interface" defaultOpen={true}>
      <EditorProvider
        canGoBack={pageHistory.length > 0}
        onGoBack={goBack}
        onOpenPage={openPage}
        onResetPageHistory={() => setHistoryState({ siteId, pages: [] })}
        onSelectPage={selectPage}
        permissions={{
          canEdit: capabilities.canEditContent,
          isAdmin: capabilities.canManageTeam,
          isLoading: false,
        }}
        siteId={siteId ?? ""}
      >
        <AppSidebar siteId={siteId} />
        <SidebarInset className="h-svh min-w-0 overflow-hidden">
          <AppHeaderProvider>
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              {children}
            </div>
          </AppHeaderProvider>
        </SidebarInset>
      </EditorProvider>
    </SidebarProvider>
  );
}
