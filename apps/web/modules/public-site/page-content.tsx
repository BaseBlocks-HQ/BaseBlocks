"use client";

import { getStoredAccessSessionTokens } from "@/modules/public-site/access-session";
import { PublicPagePanel } from "@/modules/public-site/page-panel";
import { usePagePanelState } from "@/modules/site-runtime/page-panel-state";
import { ElementRenderer } from "@/modules/site-runtime/rendering";
import { SectionContextProvider } from "@/modules/site-runtime/section";
import { api } from "@baseblocks/backend";
import type { Doc, Id } from "@baseblocks/backend";
import type { AnyContent, ElementType } from "@baseblocks/domain";
import { cn } from "@baseblocks/ui/lib/utils";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@baseblocks/ui/resizable";
import { Spinner } from "@baseblocks/ui/spinner";
import { Tabs, TabsList, TabsTrigger } from "@baseblocks/ui/tabs";
import { useIsMobile } from "@baseblocks/ui/hooks/use-mobile";
import { useQuery } from "convex/react";
import { useEffect, useState } from "react";

interface PublicPageContentProps {
  pageId: string;
  nested?: boolean;
}

interface PageStructure {
  sections: Doc<"sections">[];
  columns: Doc<"columns">[];
  blocks: Doc<"blocks">[];
}

const publicPagePanelSurfaceClassName =
  "flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border border-border/60 bg-background shadow-[0_1px_2px_hsl(var(--foreground)/0.04),0_18px_40px_hsl(var(--foreground)/0.08)] backdrop-blur-xl";

const hiddenSplitHandleClassName =
  "relative z-20 -mr-1 !w-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 after:absolute after:inset-y-0 after:left-1/2 after:block after:w-3 after:-translate-x-1/2 after:bg-transparent";

function PublishedSection({
  section,
  structure,
}: {
  section: Doc<"sections">;
  structure: PageStructure;
}) {
  const columns = structure.columns
    .filter((column) => column.sectionId === section._id)
    .sort((a, b) => a.order - b.order);

  return (
    <section
      className={cn(
        "grid min-w-0 gap-6",
        columns.length > 1 && "md:grid-cols-2",
      )}
    >
      {columns.map((column) => {
        const blocks = structure.blocks
          .filter((block) => block.columnId === column._id)
          .sort((a, b) => a.order - b.order);
        return (
          <div key={column._id} className="min-w-0 space-y-3">
            {blocks.map((block) => (
              <div
                key={block._id}
                className="prose prose-neutral dark:prose-invert max-w-none"
              >
                <SectionContextProvider
                  region={section.region}
                  sectionId={section._id}
                >
                  <ElementRenderer
                    id={block._id}
                    type={block.type as ElementType}
                    content={block.content as AnyContent}
                  />
                </SectionContextProvider>
              </div>
            ))}
          </div>
        );
      })}
    </section>
  );
}

function PublicMainContent({
  pageTitle,
  pageTabs,
  activeTabId,
  structure,
  onTabChange,
}: {
  pageTitle: string;
  pageTabs: Array<{ id: string; label: string }>;
  activeTabId: string | null;
  structure: PageStructure;
  onTabChange: (tabId: string) => void;
}) {
  const hasTabs = pageTabs.length > 0;
  const sections = structure.sections
    .filter((section) => !hasTabs || section.tabId === activeTabId)
    .sort((a, b) => a.order - b.order);
  const mainSections = sections.filter((section) => section.region === "main");
  const asideSections = sections.filter(
    (section) => section.region === "aside",
  );

  return (
    <div className="p-4 md:p-8">
      <article
        className={cn(
          "mx-auto",
          asideSections.length > 0 ? "max-w-6xl" : "max-w-4xl",
        )}
      >
        <h1 className="mb-8 text-3xl font-bold">{pageTitle}</h1>
        {hasTabs && (
          <div className="mb-8 flex justify-center">
            <Tabs value={activeTabId ?? undefined} onValueChange={onTabChange}>
              <TabsList>
                {pageTabs.map((tab) => (
                  <TabsTrigger key={tab.id} value={tab.id} className="px-4">
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
        )}
        <div
          className={cn(
            "grid gap-8",
            asideSections.length > 0 && "lg:grid-cols-[minmax(0,1fr)_18rem]",
          )}
        >
          <div className="min-w-0 space-y-8">
            {mainSections.map((section) => (
              <PublishedSection
                key={section._id}
                section={section}
                structure={structure}
              />
            ))}
          </div>
          {asideSections.length > 0 && (
            <aside className="min-w-0 space-y-6">
              {asideSections.map((section) => (
                <PublishedSection
                  key={section._id}
                  section={section}
                  structure={structure}
                />
              ))}
            </aside>
          )}
        </div>
      </article>
    </div>
  );
}

function PublicPageContentInner({ pageId, nested }: PublicPageContentProps) {
  const { viewingPage, closePage } = usePagePanelState();
  const showPagePanel = !nested && !!viewingPage;
  const sessionTokens = getStoredAccessSessionTokens();
  const page = useQuery(api.pages.get, {
    pageId: pageId as Id<"pages">,
    sessionTokens,
  });
  const structure = useQuery(api.pageContent.listPublished, {
    pageId: pageId as Id<"pages">,
    sessionTokens,
  });
  const isMobile = useIsMobile();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedTabId, setSelectedTabId] = useState<string | null>(null);
  const pageTabs = page?.pageTabs ?? [];
  const activeTabId = pageTabs.some((tab) => tab.id === selectedTabId)
    ? selectedTabId
    : (pageTabs[0]?.id ?? null);

  useEffect(() => {
    if (!viewingPage) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closePage();
        setIsFullscreen(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [closePage, viewingPage]);

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

  const mainContent = (
    <div className="h-full min-h-0 min-w-0 overflow-y-auto overflow-x-hidden">
      <PublicMainContent
        pageTitle={page.title}
        pageTabs={pageTabs}
        activeTabId={activeTabId}
        structure={structure}
        onTabChange={setSelectedTabId}
      />
    </div>
  );

  if (!showPagePanel) return mainContent;

  const pagePanel = (
    <PublicPagePanel
      isFullscreen={isFullscreen}
      onToggleFullscreen={() => setIsFullscreen((value) => !value)}
    />
  );

  if (isFullscreen || isMobile) {
    return (
      <div className="h-full min-h-0 min-w-0 p-2 md:p-3 lg:p-4">
        <section className={publicPagePanelSurfaceClassName}>
          {pagePanel}
        </section>
      </div>
    );
  }

  return (
    <ResizablePanelGroup
      className="h-full min-h-0 min-w-0"
      orientation="horizontal"
    >
      <ResizablePanel defaultSize={60} minSize={30}>
        <div className="h-full min-h-0 min-w-0 overflow-hidden pr-2">
          {mainContent}
        </div>
      </ResizablePanel>
      <ResizableHandle className={hiddenSplitHandleClassName} />
      <ResizablePanel defaultSize={40} minSize={30}>
        <div className="h-full min-h-0 min-w-0 p-2 md:p-3 lg:p-4">
          <section className={publicPagePanelSurfaceClassName}>
            {pagePanel}
          </section>
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}

export function PublicPageContent(props: PublicPageContentProps) {
  return <PublicPageContentInner {...props} />;
}
