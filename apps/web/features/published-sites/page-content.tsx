"use client";

import { useSiteRenderActions } from "@/components/site-runtime/actions";
import { baseBlocksOpenEditorTheme } from "@/features/openeditor/openeditor-theme";
import { OpenEditorTabbedPage } from "@/features/openeditor/page-tabs";
import { readOpenEditorPageTabs } from "@/features/openeditor/page-tabs-model";
import { publicSiteRenderers } from "@/features/openeditor/renderers";
import { getPageLink } from "@/features/published-sites/urls";
import { Button } from "@baseblocks/ui/button";
import type { OpenEditorDocument } from "@openeditor/core";
import {
  OpenEditorViewer,
  type OpenEditorPageRuntime,
} from "@openeditor/react";
import { OpenEditorThemeProvider } from "@openeditor/ui";
import "@openeditor/ui/styles.css";
import { ArrowLeft } from "lucide-react";
import type { PublishedPageTarget } from "./page-targets";

const EMPTY_PAGE_TARGETS = new Map<string, PublishedPageTarget>();

interface PublicPageContentProps {
  canGoBack?: boolean;
  onGoBack?: () => void;
  page: { icon?: string; title: string };
  content: OpenEditorDocument;
  pageTargets?: ReadonlyMap<string, PublishedPageTarget>;
}

export function PublicPageContent({
  canGoBack = false,
  onGoBack,
  page,
  content,
  pageTargets = EMPTY_PAGE_TARGETS,
}: PublicPageContentProps) {
  const actions = useSiteRenderActions();
  const pageRuntime: OpenEditorPageRuntime = {
    resolvePage: async (targetPageId) => {
      const target = pageTargets.get(targetPageId);
      return target && actions.siteSlug
        ? { ...target, href: getPageLink(actions.siteSlug, target.path) }
        : null;
    },
    openPage: ({ pageId: targetPageId }) => actions.openPage?.(targetPageId),
  };

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
        {content ? (
          <OpenEditorThemeProvider
            className="contents"
            theme={baseBlocksOpenEditorTheme}
          >
            {readOpenEditorPageTabs(content) ? (
              <OpenEditorTabbedPage
                document={content}
                editable={false}
                pageRuntime={pageRuntime}
                renderers={publicSiteRenderers}
              />
            ) : (
              <OpenEditorViewer
                className="oe-viewer"
                document={content}
                pageRuntime={pageRuntime}
                renderers={publicSiteRenderers}
              />
            )}
          </OpenEditorThemeProvider>
        ) : null}
      </article>
    </div>
  );
}
