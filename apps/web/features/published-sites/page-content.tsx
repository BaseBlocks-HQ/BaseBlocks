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
import { useQuery } from "convex/react";
import type { OpenEditorDocument } from "@openeditor/core";
import {
  OpenEditorViewer,
  type OpenEditorPageRuntime,
} from "@openeditor/react";
import { OpenEditorThemeProvider } from "@openeditor/ui";
import "@openeditor/ui/styles.css";
import { useMemo } from "react";
import type { PublishedPageTarget } from "./page-targets";

type ResolvedPageContent = { document: OpenEditorDocument };
const EMPTY_PAGE_TARGETS = new Map<string, PublishedPageTarget>();

interface PublicPageContentProps {
  pageId: string;
  initialPage?: { title: string };
  initialStructure?: ResolvedPageContent;
  pageTargets?: ReadonlyMap<string, PublishedPageTarget>;
}

export function PublicPageContent({
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
        <h1 className="mb-8 text-3xl font-bold">{page.title}</h1>
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
