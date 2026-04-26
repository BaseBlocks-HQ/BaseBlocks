"use client";

import { LayoutContextProvider } from "@/modules/elements/framework/layout-context";
import { ElementRendererWrapper } from "@/modules/elements/framework/renderer-wrapper";
import "@/modules/elements/layouts";
import "@/modules/elements/blocks";
import "@/modules/elements/sections";
import "@/modules/elements/media";
import { ContentSkeleton } from "@/components/skeletons";
import { usePage, usePublishedLayouts } from "@/lib/data";
import { cn } from "@/lib/utils";
import {
  SPACER_LAYOUT_HEIGHTS,
  getLayoutGridStyle,
} from "@/modules/shared/layouts";
import type { Doc } from "@baseblocks/backend";
import type {
  AnyContent,
  ElementType,
  LayoutSettings,
  LayoutType,
  SpacerLayoutHeight,
} from "@baseblocks/types";
import { ScrollArea } from "@baseblocks/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@baseblocks/ui/tabs";
import { type RefObject, useEffect, useRef, useState } from "react";
import { SplitViewShell } from "../shared/components/split-view-shell";
import { PublicPageDetailPanel } from "./public-page-detail-panel";
import { usePublicPagePanel } from "./public-page-panel-context";

type LayoutDoc = Doc<"layouts">;
type SlotDoc = LayoutDoc["slots"][number];
type BlockDoc = SlotDoc["blocks"][number];

interface PublicContentProps {
  pageId: string;
  /** When true, page panel rendering is disabled to prevent infinite recursion */
  nested?: boolean;
  searchTerm?: string;
}

const SEARCH_HIGHLIGHT_SELECTOR = 'mark[data-search-highlight="true"]';
const SEARCH_HIGHLIGHT_CLASS_NAME =
  "bg-yellow-200 dark:bg-yellow-800 text-foreground px-0.5 rounded";

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

// Failure modes:
// - Search opens the page panel before layouts finish rendering.
// - Matching text lives inside nested text nodes rather than a standalone element.
// - The result was a title-only match, so there may be nothing in the body to scroll to.
function highlightTextMatches(
  root: HTMLElement,
  searchTerm: string,
): HTMLElement[] {
  const normalizedSearchTerm = searchTerm.trim().toLowerCase();
  if (!normalizedSearchTerm) {
    return [];
  }

  const textNodes: Text[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      const textContent = node.textContent?.trim();

      if (!parent || !textContent) {
        return NodeFilter.FILTER_SKIP;
      }

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

    if (!text || !parent) {
      continue;
    }

    const lowerText = text.toLowerCase();
    let startIndex = 0;
    let matchIndex = lowerText.indexOf(normalizedSearchTerm, startIndex);

    if (matchIndex === -1) {
      continue;
    }

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

function renderPublishedLayout(layout: LayoutDoc) {
  if (layout.type === "spacer") {
    const settings = layout.settings as LayoutSettings;
    const height: SpacerLayoutHeight = settings.spacerHeight ?? "medium";
    return (
      <div
        key={layout._id}
        style={{ height: `${SPACER_LAYOUT_HEIGHTS[height]}px` }}
        className="w-full"
        aria-hidden="true"
      />
    );
  }

  const gridStyle = getLayoutGridStyle(
    layout.type as LayoutType,
    layout.settings as LayoutSettings,
  );

  return (
    <div key={layout._id} style={gridStyle}>
      {layout.slots.map((slot: SlotDoc) => (
        <div key={slot.id} className="min-w-0">
          {slot.blocks.map((block: BlockDoc, index: number) => (
            <div
              key={block.id}
              className={cn(
                "prose prose-neutral dark:prose-invert max-w-none",
                index < slot.blocks.length - 1 && "mb-3",
              )}
            >
              <LayoutContextProvider
                layoutType={layout.type as LayoutType}
                layoutId={layout._id}
              >
                <ElementRendererWrapper
                  id={block.id}
                  type={block.type as ElementType}
                  content={block.content as AnyContent}
                />
              </LayoutContextProvider>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function PublicMainContent({
  pageTitle,
  pageTabs,
  activeTabId,
  hasTabs,
  hasSidebar,
  mainLayouts,
  sidebarLayouts,
  onTabChange,
  contentRef,
  contentClassName,
}: {
  pageTitle: string;
  pageTabs: Array<{ id: string; label: string }>;
  activeTabId: string | null;
  hasTabs: boolean;
  hasSidebar: boolean;
  mainLayouts: LayoutDoc[];
  sidebarLayouts: LayoutDoc[];
  onTabChange: (tabId: string) => void;
  contentRef?: RefObject<HTMLDivElement | null>;
  contentClassName?: string;
}) {
  return (
    <div ref={contentRef} className={cn("p-4 md:p-8", contentClassName)}>
      <article
        className={cn("mx-auto", hasSidebar ? "max-w-6xl" : "max-w-4xl")}
      >
        <h1 className="text-3xl font-bold mb-8">{pageTitle}</h1>
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

        {hasSidebar ? (
          <div className="flex flex-col lg:flex-row gap-8">
            <div className="flex-1 min-w-0 space-y-8">
              {mainLayouts.map(renderPublishedLayout)}
            </div>
            <aside className="w-full lg:w-72 flex-shrink-0 space-y-6">
              {sidebarLayouts.map(renderPublishedLayout)}
            </aside>
          </div>
        ) : (
          <div className="space-y-8">
            {mainLayouts.map(renderPublishedLayout)}
          </div>
        )}
      </article>
    </div>
  );
}

function PublicContentInner({
  pageId,
  nested,
  searchTerm,
}: PublicContentProps) {
  const { viewingPage, closePage } = usePublicPagePanel();
  const showPagePanel = !nested && !!viewingPage;
  const pageData = usePage(pageId);
  const layoutsData = usePublishedLayouts(pageId);
  const contentRef = useRef<HTMLDivElement>(null);
  const lastAutoScrolledKeyRef = useRef<string | null>(null);

  // Fullscreen state for page panel
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Page-level tabs
  const pageTabs = pageData?.pageTabs ?? [];
  const hasTabs = pageTabs.length > 0;
  const [userSelectedTabId, setActiveTabId] = useState<string | null>(null);

  // Derive the effective active tab during render — no useEffect needed
  const activeTabId = (() => {
    if (!hasTabs) return null;
    if (userSelectedTabId && pageTabs.some((t) => t.id === userSelectedTabId)) {
      return userSelectedTabId;
    }
    return pageTabs[0]?.id ?? null;
  })();

  // ESC key to close page panel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && viewingPage) {
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

    if (contentElement) {
      clearSearchHighlights(contentElement);
    }

    if (!normalizedSearchTerm) {
      lastAutoScrolledKeyRef.current = null;
      return;
    }

    if (
      !nested ||
      pageData === undefined ||
      pageData === null ||
      layoutsData === undefined
    ) {
      return;
    }

    const scrollKey = `${pageId}:${normalizedSearchTerm.toLowerCase()}`;
    if (lastAutoScrolledKeyRef.current === scrollKey) {
      return;
    }

    let cancelled = false;
    let frameId = 0;
    let attempts = 0;

    const tryScrollToMatch = () => {
      if (cancelled) {
        return;
      }

      const currentContentElement = contentRef.current;
      if (!currentContentElement) {
        return;
      }

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

      if (attempts >= 20) {
        return;
      }

      attempts += 1;
      frameId = requestAnimationFrame(tryScrollToMatch);
    };

    frameId = requestAnimationFrame(tryScrollToMatch);

    return () => {
      cancelled = true;
      cancelAnimationFrame(frameId);
      const currentContentElement = contentRef.current;
      if (currentContentElement) {
        clearSearchHighlights(currentContentElement);
      }
    };
  }, [layoutsData, nested, pageData, pageId, searchTerm]);

  if (pageData === undefined || layoutsData === undefined) {
    return (
      <div className="p-8">
        <ContentSkeleton />
      </div>
    );
  }

  if (pageData === null) {
    return (
      <div className="max-w-3xl mx-auto text-center py-12">
        <p className="text-muted-foreground">Page not found</p>
      </div>
    );
  }

  // Filter layouts by active tab (if tabs exist)
  const filteredLayouts = hasTabs
    ? layoutsData.filter((layout: LayoutDoc) => layout.tabId === activeTabId)
    : layoutsData;

  // Separate main layouts from sidebar layouts
  const mainLayouts = filteredLayouts.filter(
    (layout: LayoutDoc) => layout.type !== "vertical",
  );
  const sidebarLayouts = filteredLayouts.filter(
    (layout: LayoutDoc) => layout.type === "vertical",
  );
  const hasSidebar = sidebarLayouts.length > 0;

  if (showPagePanel) {
    return (
      <div className="flex-1 min-h-0 min-w-0 overflow-hidden">
        <SplitViewShell
          className="h-full"
          detail={
            <PublicPageDetailPanel
              isFullscreen={isFullscreen}
              onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
            />
          }
          detailCollapsedOnMobile
          detailExpanded={isFullscreen}
          detailPanelClassName="pr-2 pb-2 pt-2 md:pr-3 md:pb-3 md:pt-3 lg:pr-4 lg:pb-4 lg:pt-4"
          detailSurfaceClassName="rounded-xl bg-background"
          mainPanelClassName="pr-2 md:pr-2 lg:pr-2"
          main={
            <ScrollArea className="h-full min-h-0 w-full min-w-0">
              <div className="overflow-x-hidden">
                <PublicMainContent
                  pageTitle={pageData.title}
                  pageTabs={pageTabs}
                  activeTabId={activeTabId}
                  hasTabs={hasTabs}
                  hasSidebar={hasSidebar}
                  mainLayouts={mainLayouts}
                  sidebarLayouts={sidebarLayouts}
                  onTabChange={setActiveTabId}
                  contentRef={contentRef}
                  contentClassName="pr-3 md:pr-3 lg:pr-3"
                />
              </div>
            </ScrollArea>
          }
        />
      </div>
    );
  }

  // Normal view - no wrapper, parent handles scroll
  return (
    <ScrollArea className="h-full min-h-0 w-full min-w-0">
      <div className="overflow-x-hidden">
        <PublicMainContent
          pageTitle={pageData.title}
          pageTabs={pageTabs}
          activeTabId={activeTabId}
          hasTabs={hasTabs}
          hasSidebar={hasSidebar}
          mainLayouts={mainLayouts}
          sidebarLayouts={sidebarLayouts}
          onTabChange={setActiveTabId}
          contentRef={contentRef}
        />
      </div>
    </ScrollArea>
  );
}

export function PublicContent({
  pageId,
  nested,
  searchTerm,
}: PublicContentProps) {
  return (
    <PublicContentInner
      pageId={pageId}
      nested={nested}
      searchTerm={searchTerm}
    />
  );
}
