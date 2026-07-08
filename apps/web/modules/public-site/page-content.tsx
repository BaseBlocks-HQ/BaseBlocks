"use client";

import { usePage } from "@/lib/data";
import { cn } from "@/lib/utils";
import { usePagePanelState } from "@/modules/site-runtime/page-panel-state";
import { ElementRenderer } from "@/modules/site-runtime/rendering";
import type {
  ElementPageBlock,
  ElementType,
  PageBlock,
  SpacerPageBlock,
} from "@baseblocks/domain";
import { useIsMobile } from "@baseblocks/ui/hooks/use-mobile";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@baseblocks/ui/resizable";
import { ScrollArea } from "@baseblocks/ui/scroll-area";
import { Spinner } from "@baseblocks/ui/spinner";
import { Tabs, TabsList, TabsTrigger } from "@baseblocks/ui/tabs";
import { type RefObject, useEffect, useRef, useState } from "react";
import { PublicPagePanel } from "./page-panel";

interface PublicPageContentProps {
  pageId: string;
  nested?: boolean;
  searchTerm?: string;
}

const SEARCH_HIGHLIGHT_SELECTOR = 'mark[data-search-highlight="true"]';
const SEARCH_HIGHLIGHT_CLASS_NAME =
  "bg-yellow-200 dark:bg-yellow-800 text-foreground px-0.5 rounded";

const publicPagePanelSurfaceClassName =
  "flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border border-border/60 bg-background shadow-[0_1px_2px_hsl(var(--foreground)/0.04),0_18px_40px_hsl(var(--foreground)/0.08)] backdrop-blur-xl";

const hiddenSplitHandleClassName =
  "relative z-20 -mr-1 !w-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 after:absolute after:inset-y-0 after:left-1/2 after:block after:w-3 after:-translate-x-1/2 after:bg-transparent";

function clearSearchHighlights(root: HTMLElement) {
  const highlights = root.querySelectorAll(SEARCH_HIGHLIGHT_SELECTOR);
  for (const highlight of highlights) {
    const parent = highlight.parentNode;
    if (!parent) continue;

    parent.replaceChild(
      document.createTextNode(highlight.textContent ?? ""),
      highlight,
    );
    parent.normalize();
  }
}

function highlightTextMatches(
  root: HTMLElement,
  searchTerm: string,
): HTMLElement[] {
  const normalizedSearchTerm = searchTerm.trim().toLowerCase();
  if (!normalizedSearchTerm) return [];

  const textNodes: Text[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      const textContent = node.textContent?.trim();

      if (!parent || !textContent) return NodeFilter.FILTER_SKIP;
      if (parent.closest("script, style, noscript")) {
        return NodeFilter.FILTER_REJECT;
      }
      if (parent.closest(SEARCH_HIGHLIGHT_SELECTOR)) {
        return NodeFilter.FILTER_REJECT;
      }

      return textContent.toLowerCase().includes(normalizedSearchTerm)
        ? NodeFilter.FILTER_ACCEPT
        : NodeFilter.FILTER_SKIP;
    },
  });

  let currentNode = walker.nextNode();
  while (currentNode) {
    textNodes.push(currentNode as Text);
    currentNode = walker.nextNode();
  }

  const highlights: HTMLElement[] = [];
  for (const textNode of textNodes) {
    const text = textNode.textContent;
    const parent = textNode.parentNode;
    if (!text || !parent) continue;

    const lowerText = text.toLowerCase();
    let startIndex = 0;
    let matchIndex = lowerText.indexOf(normalizedSearchTerm, startIndex);
    if (matchIndex === -1) continue;

    const fragment = document.createDocumentFragment();
    while (matchIndex !== -1) {
      if (matchIndex > startIndex) {
        fragment.appendChild(
          document.createTextNode(text.slice(startIndex, matchIndex)),
        );
      }

      const mark = document.createElement("mark");
      mark.dataset.searchHighlight = "true";
      mark.className = SEARCH_HIGHLIGHT_CLASS_NAME;
      mark.textContent = text.slice(
        matchIndex,
        matchIndex + normalizedSearchTerm.length,
      );
      fragment.appendChild(mark);
      highlights.push(mark);

      startIndex = matchIndex + normalizedSearchTerm.length;
      matchIndex = lowerText.indexOf(normalizedSearchTerm, startIndex);
    }

    if (startIndex < text.length) {
      fragment.appendChild(document.createTextNode(text.slice(startIndex)));
    }

    parent.replaceChild(fragment, textNode);
  }

  return highlights;
}

function SpacerBlock({ block }: { block: SpacerPageBlock }) {
  const heights: Record<SpacerPageBlock["size"], number> = {
    small: 32,
    medium: 64,
    large: 96,
    xlarge: 128,
  };

  return (
    <div
      className="w-full"
      style={{ height: heights[block.size] }}
      aria-hidden="true"
    />
  );
}

function PublicBlock({ block }: { block: PageBlock }) {
  if (block.type === "spacer") return <SpacerBlock block={block} />;

  if (block.type === "single") {
    return (
      <div className="space-y-8">
        {block.blocks.map((child) => (
          <PublicBlock key={child.id} block={child} />
        ))}
      </div>
    );
  }

  if (block.type === "rows") {
    return (
      <div className="space-y-6">
        {block.rows.map((row) => (
          <div key={row.id} className="min-w-0 space-y-4">
            {row.blocks.map((child) => (
              <PublicBlock key={child.id} block={child} />
            ))}
          </div>
        ))}
      </div>
    );
  }

  if (block.type === "columns") {
    return (
      <div className="grid gap-6 md:grid-cols-2">
        {block.columns.map((column) => (
          <div key={column.id} className="min-w-0 space-y-4">
            {column.blocks.map((child) => (
              <PublicBlock key={child.id} block={child} />
            ))}
          </div>
        ))}
      </div>
    );
  }

  if (block.type === "grid") {
    return (
      <div
        className="grid gap-6"
        style={{
          gridTemplateColumns: `repeat(${Math.max(1, block.columns)}, minmax(0, 1fr))`,
        }}
      >
        {block.cells.map((cell) => (
          <div key={cell.id} className="min-w-0 space-y-4">
            {cell.blocks.map((child) => (
              <PublicBlock key={child.id} block={child} />
            ))}
          </div>
        ))}
      </div>
    );
  }

  if (block.type === "sidebar") {
    const aside = (
      <aside className="min-w-0 space-y-4">
        {block.aside.blocks.map((child) => (
          <PublicBlock key={child.id} block={child} />
        ))}
      </aside>
    );
    const main = (
      <div className="min-w-0 space-y-4">
        {block.main.blocks.map((child) => (
          <PublicBlock key={child.id} block={child} />
        ))}
      </div>
    );

    return (
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        {block.side === "left" ? (
          <>
            {aside}
            {main}
          </>
        ) : (
          <>
            {main}
            {aside}
          </>
        )}
      </div>
    );
  }

  if (block.type === "tabs") {
    const firstTabId = block.tabs[0]?.id ?? "";
    return <PublicTabsBlock block={block} initialTabId={firstTabId} />;
  }

  return (
    <div className="prose prose-neutral dark:prose-invert max-w-none">
      <ElementRenderer
        id={block.id}
        type={block.type as ElementType}
        content={(block as ElementPageBlock).content}
      />
    </div>
  );
}

function PublicTabsBlock({
  block,
  initialTabId,
}: {
  block: Extract<PageBlock, { type: "tabs" }>;
  initialTabId: string;
}) {
  const [activeTabId, setActiveTabId] = useState(initialTabId);
  const activeTab = block.tabs.find((tab) => tab.id === activeTabId);

  if (block.tabs.length === 0) return null;

  return (
    <div>
      <div className="mb-6 flex justify-center">
        <Tabs value={activeTabId} onValueChange={setActiveTabId}>
          <TabsList>
            {block.tabs.map((tab) => (
              <TabsTrigger key={tab.id} value={tab.id} className="px-4">
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>
      <div className="space-y-8">
        {(activeTab?.blocks ?? []).map((child) => (
          <PublicBlock key={child.id} block={child} />
        ))}
      </div>
    </div>
  );
}

function PublicMainContent({
  blocks,
  contentClassName,
  contentRef,
  pageTitle,
}: {
  blocks: PageBlock[];
  contentClassName?: string;
  contentRef?: RefObject<HTMLDivElement | null>;
  pageTitle: string;
}) {
  return (
    <div ref={contentRef} className={cn("p-4 md:p-8", contentClassName)}>
      <article className="mx-auto max-w-4xl">
        <h1 className="mb-8 text-3xl font-bold">{pageTitle}</h1>
        <div className="space-y-8">
          {blocks.map((block) => (
            <PublicBlock key={block.id} block={block} />
          ))}
        </div>
      </article>
    </div>
  );
}

function PublicPageContentInner({
  pageId,
  nested,
  searchTerm,
}: PublicPageContentProps) {
  const { viewingPage, closePage } = usePagePanelState();
  const showPagePanel = !nested && !!viewingPage;
  const pageData = usePage(pageId);
  const contentRef = useRef<HTMLDivElement>(null);
  const lastAutoScrolledKeyRef = useRef<string | null>(null);
  const isMobile = useIsMobile();
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && viewingPage) {
        closePage();
        setIsFullscreen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [viewingPage, closePage]);

  useEffect(() => {
    const normalizedSearchTerm = searchTerm?.trim();
    const contentElement = contentRef.current;
    if (contentElement) clearSearchHighlights(contentElement);

    if (!normalizedSearchTerm) {
      lastAutoScrolledKeyRef.current = null;
      return;
    }

    if (!nested || pageData === undefined || pageData === null) return;

    const scrollKey = `${pageId}:${normalizedSearchTerm.toLowerCase()}`;
    if (lastAutoScrolledKeyRef.current === scrollKey) return;

    let cancelled = false;
    let frameId = 0;
    let attempts = 0;

    const tryScrollToMatch = () => {
      if (cancelled) return;

      const currentContentElement = contentRef.current;
      if (!currentContentElement) return;

      const highlights = highlightTextMatches(
        currentContentElement,
        normalizedSearchTerm,
      );
      const matchElement = highlights[0];
      if (matchElement) {
        matchElement.scrollIntoView({ behavior: "smooth", block: "center" });
        lastAutoScrolledKeyRef.current = scrollKey;
        return;
      }

      if (attempts >= 20) return;
      attempts += 1;
      frameId = requestAnimationFrame(tryScrollToMatch);
    };

    frameId = requestAnimationFrame(tryScrollToMatch);

    return () => {
      cancelled = true;
      cancelAnimationFrame(frameId);
      const currentContentElement = contentRef.current;
      if (currentContentElement) clearSearchHighlights(currentContentElement);
    };
  }, [nested, pageData, pageId, searchTerm]);

  if (pageData === undefined) {
    return (
      <div className="flex min-h-48 items-center justify-center p-8">
        <Spinner className="size-6 text-muted-foreground" />
      </div>
    );
  }

  if (pageData === null) {
    return (
      <div className="mx-auto max-w-3xl py-12 text-center">
        <p className="text-muted-foreground">Page not found</p>
      </div>
    );
  }

  const blocks = (pageData.content?.blocks ?? []) as PageBlock[];

  if (showPagePanel) {
    const pagePanel = (
      <PublicPagePanel
        isFullscreen={isFullscreen}
        onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
      />
    );
    const mainContent = (
      <ScrollArea className="h-full min-h-0 w-full min-w-0">
        <div className="overflow-x-hidden">
          <PublicMainContent
            blocks={blocks}
            pageTitle={pageData.title}
            contentRef={contentRef}
            contentClassName="pr-3 md:pr-3 lg:pr-3"
          />
        </div>
      </ScrollArea>
    );

    return (
      <div className="min-h-0 min-w-0 flex-1 overflow-hidden">
        {isFullscreen || isMobile ? (
          <div className="h-full min-h-0 min-w-0">
            <div className="h-full min-h-0 min-w-0 pr-2 pb-2 pt-2 md:pr-3 md:pb-3 md:pt-3 lg:pr-4 lg:pb-4 lg:pt-4">
              <section className={publicPagePanelSurfaceClassName}>
                {pagePanel}
              </section>
            </div>
          </div>
        ) : (
          <div className="h-full min-h-0 min-w-0">
            <ResizablePanelGroup
              className="h-full min-h-0 min-w-0"
              orientation="horizontal"
            >
              <ResizablePanel defaultSize={60} minSize={30}>
                <div className="h-full min-h-0 min-w-0 overflow-hidden pr-2 md:pr-2 lg:pr-2">
                  {mainContent}
                </div>
              </ResizablePanel>
              <ResizableHandle className={hiddenSplitHandleClassName} />
              <ResizablePanel defaultSize={40} minSize={30}>
                <div className="h-full min-h-0 min-w-0 pr-2 pb-2 pt-2 md:pr-3 md:pb-3 md:pt-3 lg:pr-4 lg:pb-4 lg:pt-4">
                  <section className={publicPagePanelSurfaceClassName}>
                    {pagePanel}
                  </section>
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
          </div>
        )}
      </div>
    );
  }

  return (
    <ScrollArea className="h-full min-h-0 w-full min-w-0">
      <div className="overflow-x-hidden">
        <PublicMainContent
          blocks={blocks}
          pageTitle={pageData.title}
          contentRef={contentRef}
        />
      </div>
    </ScrollArea>
  );
}

export function PublicPageContent({
  pageId,
  nested,
  searchTerm,
}: PublicPageContentProps) {
  return (
    <PublicPageContentInner
      pageId={pageId}
      nested={nested}
      searchTerm={searchTerm}
    />
  );
}
