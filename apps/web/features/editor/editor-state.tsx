"use client";

import { api, type Doc, type Id } from "@baseblocks/backend";
import { useQuery } from "convex/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { type ReactNode, createContext, use, useEffect, useState } from "react";

interface EditorPermissions {
  canEdit: boolean;
  isAdmin: boolean;
  isLoading: boolean;
}

interface EditorNavigationContextValue {
  canGoBack: boolean;
  goBack: () => void;
  openPage: (pageId: string) => void;
  resetPageHistory: () => void;
  selectPage: (pageId: string) => void;
}

interface EditorSiteContextValue {
  siteId: string;
  canEdit: boolean;
  isAdmin: boolean;
  isPermissionsLoading: boolean;
}

interface EditorWorkspaceContextValue {
  status: "idle" | "loading" | "ready" | "missing";
  site: Doc<"sites"> | null;
  pages: Doc<"pages">[];
  selectedPage: Doc<"pages"> | null;
  selectedPageId: string | null;
  restore: {
    _id: Id<"draftRestores">;
    status: Doc<"draftRestores">["status"] | "orphaned";
    failure?: string;
  } | null;
}

const EditorNavigationContext =
  createContext<EditorNavigationContextValue | null>(null);
const EditorSiteContext = createContext<EditorSiteContextValue | null>(null);
const EditorWorkspaceContext =
  createContext<EditorWorkspaceContextValue | null>(null);

interface EditorProviderProps {
  siteId: string;
  organizationId: string;
  permissions: EditorPermissions;
  children: ReactNode;
}

function buildAppPath(
  pathname: string,
  currentSearchParams: string,
  pageId: string | null,
) {
  const params = new URLSearchParams(currentSearchParams);
  if (pageId) params.set("page", pageId);
  else params.delete("page");
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function EditorProvider({
  siteId,
  organizationId,
  permissions,
  children,
}: EditorProviderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchParamsKey = searchParams.toString();
  const requestedPageId = searchParams.get("page");
  const workspace = useQuery(
    api.editorWorkspace.get,
    siteId ? { organizationId, siteId: siteId as Id<"sites"> } : "skip",
  );
  const [historyState, setHistoryState] = useState<{
    siteId: string;
    pages: (string | null)[];
  }>({ siteId, pages: [] });
  const pageHistory = historyState.siteId === siteId ? historyState.pages : [];

  const pages = workspace?.pages ?? [];
  const workspaceReady = workspace !== undefined && workspace !== null;
  const selectedPage =
    pages.find((page) => page._id === requestedPageId) ?? pages[0] ?? null;
  const selectedPageId = selectedPage?._id ?? null;

  const replaceEditorUrl = (pageId: string | null) => {
    router.replace(buildAppPath(pathname, searchParamsKey, pageId), {
      scroll: false,
    });
  };

  useEffect(() => {
    if (!siteId || !workspaceReady) return;
    if (requestedPageId === selectedPageId) return;
    window.history.replaceState(
      null,
      "",
      buildAppPath(pathname, searchParamsKey, selectedPageId),
    );
  }, [
    pathname,
    requestedPageId,
    searchParamsKey,
    selectedPageId,
    siteId,
    workspaceReady,
  ]);

  const openPage = (pageId: string) => {
    if (selectedPageId === pageId) return;
    setHistoryState((current) => ({
      siteId,
      pages:
        current.siteId === siteId
          ? [...current.pages, selectedPageId]
          : [selectedPageId],
    }));
    replaceEditorUrl(pageId);
  };

  const selectPage = (pageId: string) => {
    setHistoryState({ siteId, pages: [] });
    replaceEditorUrl(pageId);
  };

  const goBack = () => {
    if (pageHistory.length === 0) return;
    replaceEditorUrl(pageHistory.at(-1) ?? null);
    setHistoryState({ siteId, pages: pageHistory.slice(0, -1) });
  };

  const resetPageHistory = () => {
    setHistoryState({ siteId, pages: [] });
  };

  const navigationValue: EditorNavigationContextValue = {
    canGoBack: pageHistory.length > 0,
    goBack,
    openPage,
    resetPageHistory,
    selectPage,
  };
  const siteValue: EditorSiteContextValue = {
    siteId,
    canEdit: permissions.canEdit,
    isAdmin: permissions.isAdmin,
    isPermissionsLoading: permissions.isLoading,
  };
  const workspaceValue: EditorWorkspaceContextValue = {
    status: !siteId
      ? "idle"
      : workspace === undefined
        ? "loading"
        : workspace === null
          ? "missing"
          : "ready",
    site: workspace?.site ?? null,
    pages,
    selectedPage,
    selectedPageId,
    restore: workspace?.restore ?? null,
  };

  return (
    <EditorSiteContext.Provider value={siteValue}>
      <EditorWorkspaceContext.Provider value={workspaceValue}>
        <EditorNavigationContext.Provider value={navigationValue}>
          {children}
        </EditorNavigationContext.Provider>
      </EditorWorkspaceContext.Provider>
    </EditorSiteContext.Provider>
  );
}

export function useEditorUi() {
  const context = use(EditorNavigationContext);
  if (!context) {
    throw new Error("useEditorUi must be used within an EditorProvider");
  }
  return context;
}

export function useEditorWorkspace() {
  const context = use(EditorWorkspaceContext);
  if (!context) {
    throw new Error("useEditorWorkspace must be used within an EditorProvider");
  }
  return context;
}

export function useEditorSite() {
  const context = use(EditorSiteContext);
  if (!context) {
    throw new Error("useEditorSite must be used within an EditorProvider");
  }
  return context;
}

export function useEditorSiteOptional() {
  return use(EditorSiteContext);
}
