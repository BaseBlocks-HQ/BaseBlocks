"use client";

import { getStoredAccessSessionTokens } from "@/features/published-sites/access-session";
import { useSiteRenderActions } from "@/components/site-runtime/actions";
import { openEditorExtensions } from "@/features/openeditor/extensions";
import { baseBlocksOpenEditorTheme } from "@/features/openeditor/openeditor-theme";
import { OpenEditorTabbedPage } from "@/features/openeditor/page-tabs";
import { readOpenEditorPageTabs } from "@/features/openeditor/page-tabs-model";
import { getPageLink } from "@/features/published-sites/urls";
import { api } from "@baseblocks/backend";
import type { Id } from "@baseblocks/backend";
import { Spinner } from "@baseblocks/ui/spinner";
import { Button } from "@baseblocks/ui/button";
import { useQuery } from "convex/react";
import type { OpenEditorDocument } from "@openeditor/core";
import {
  OpenEditorViewer,
  type OpenEditorPageRuntime,
} from "@openeditor/react";
import { OpenEditorThemeProvider } from "@openeditor/ui";
import "@openeditor/ui/styles.css";
import { ArrowLeft } from "lucide-react";
import { useMemo } from "react";
import type { PublishedPageTarget } from "./page-targets";

type ResolvedPageContent = { document: OpenEditorDocument };
const EMPTY_PAGE_TARGETS = new Map<string, PublishedPageTarget>();

interface PublicPageContentProps {
  canGoBack?: boolean;
  onGoBack?: () => void;
  pageId: string;
  initialPage?: { icon?: string; title: string };
  initialStructure?: ResolvedPageContent;
  pageTargets?: ReadonlyMap<string, PublishedPageTarget>;
}

export function PublicPageContent({
  canGoBack = false,
  onGoBack,
  pageId,
  initialPage,
  initialStructure,
  pageTargets = EMPTY_PAGE_TARGETS,
}: PublicPageContentProps) {
  const sessionTokens = getStoredAccessSessionTokens();
  const queriedPage = useQuery(
    api.pages.get,
    initialPage ? "skip" : { pageId: pageId as Id<"pages">, sessionTokens },
  );
  const queriedStructure = useQuery(
    api.pageContent.getPublished,
    initialStructure
      ? "skip"
      : { pageId: pageId as Id<"pages">, sessionTokens },
  );
  const page = initialPage ?? queriedPage;
  const structure = initialStructure ?? queriedStructure;
  const actions = useSiteRenderActions();
  const openEditorDocument = structure?.document;
  const pageRuntime = useMemo<OpenEditorPageRuntime>(
    () => ({
      resolvePage: async (targetPageId) => {
        const target = pageTargets.get(targetPageId);
        return target && actions.siteSlug
          ? { ...target, href: getPageLink(actions.siteSlug, target.path) }
          : null;
      },
      openPage: ({ pageId: targetPageId }) => actions.openPage?.(targetPageId),
    }),
    [actions, pageTargets],
  );

  if (page === undefined || structure === undefined) {
    return (
      <div className="flex min-h-48 items-center justify-center p-8">
        <Spinner className="size-6 text-muted-foreground" />
      </div>
    );
  }
  if (!page) {
    return (
      <div className="mx-auto max-w-3xl py-12 text-center text-muted-foreground">
        Page not found
      </div>
    );
  }

  return (
    <div className="h-full min-h-0 min-w-0 overflow-y-auto overflow-x-hidden pt-[var(--bb-header-height)]">
      <article className="mx-auto max-w-4xl px-4 py-8 md:px-8 [&_.oe-page-arrow]:hidden">
        <div className="mb-8 flex min-w-0 items-center gap-2">
          {canGoBack && onGoBack ? (
            <Button
              aria-label="Back to previous page"
              className="shrink-0 rounded-lg"
              onClick={onGoBack}
              size="icon"
              title="Back to previous page"
              variant="ghost"
            >
              <ArrowLeft />
            </Button>
          ) : null}
          <span aria-hidden="true" className="shrink-0 text-3xl leading-none">
            {page.icon ?? "📄"}
          </span>
          <h1 className="min-w-0 truncate text-3xl font-bold">{page.title}</h1>
        </div>
        {openEditorDocument ? (
          <OpenEditorThemeProvider
            className="contents"
            theme={baseBlocksOpenEditorTheme}
          >
            {readOpenEditorPageTabs(openEditorDocument) ? (
              <OpenEditorTabbedPage
                document={openEditorDocument}
                editable={false}
                extensions={openEditorExtensions}
                pageRuntime={pageRuntime}
              />
            ) : (
              <OpenEditorViewer
                className="oe-viewer"
                document={openEditorDocument}
                extensions={openEditorExtensions}
                pageRuntime={pageRuntime}
              />
            )}
          </OpenEditorThemeProvider>
        ) : null}
      </article>
    </div>
  );
}
