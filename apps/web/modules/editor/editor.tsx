"use client";

import { getStoredAccessSessionTokens } from "@/modules/public-site/access-session";
import { cn } from "@baseblocks/ui/lib/utils";
import { EditorProvider } from "@/modules/editor/editor-state";
import { useEditorUi } from "@/modules/editor/editor-state";
import { PublicPagePanel } from "@/modules/public-site/page-panel";
import { getDefaultContent } from "@/modules/site-elements/registry";
import { useSiteCustomization } from "@/modules/editor/settings/use-site-customization";
import { usePagePanelState } from "@/modules/site-runtime/page-panel-state";
import { useTeamAccess } from "@/modules/workspace/team-access";
import { api } from "@baseblocks/backend";
import type { Doc, Id } from "@baseblocks/backend";
import type {
  AnyContent,
  ElementType,
  LayoutBlockType,
  LayoutType,
} from "@baseblocks/domain";
import { createBlockDraft } from "@baseblocks/domain";
import { BlurStack } from "@baseblocks/ui/blur-stack";
import { PortalContainerProvider } from "@baseblocks/ui/contexts/portal-container-context";
import { useDebounceCallback } from "@baseblocks/ui/hooks/use-debounce";
import { useIsMobile } from "@baseblocks/ui/hooks/use-mobile";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@baseblocks/ui/resizable";
import { ScrollArea } from "@baseblocks/ui/scroll-area";
import { Spinner } from "@baseblocks/ui/spinner";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { Maximize2, Minimize2, X } from "lucide-react";
import { nanoid } from "nanoid";
import { useTranslations } from "next-intl";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { type ReactNode, Suspense, useEffect, useMemo, useState } from "react";
import { PageEditor } from "@/modules/editor/canvas/page-canvas";
import { toast } from "sonner";
import { ToolbarButton } from "@/modules/file-preview";
import { EditorFloatingRail } from "./rail/editor-rail";
import { EditorHeader } from "./editor-header";

const pagePanelSurfaceClassName =
  "flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border border-border/60 bg-background shadow-[0_1px_2px_hsl(var(--foreground)/0.04),0_18px_40px_hsl(var(--foreground)/0.08)] backdrop-blur-xl";

const hiddenSplitHandleClassName =
  "relative z-20 -mr-1 !w-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 after:absolute after:inset-y-0 after:left-1/2 after:block after:w-3 after:-translate-x-1/2 after:bg-transparent";

function buildEditorPath(
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

function PageEditorPanel({
  isFullscreen,
  onToggleFullscreen,
}: {
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}) {
  const t = useTranslations("editor.pagePanel");
  const { editingPage, closePageEditor } = useEditorUi();
  const sessionTokens = getStoredAccessSessionTokens();
  const page = useQuery(
    api.pages.get,
    editingPage?.pageId
      ? { pageId: editingPage.pageId as Id<"pages">, sessionTokens }
      : "skip",
  );
  const updatePage = useMutation(api.pages.update);
  const [title, setTitle] = useState(page?.title ?? "");

  useEffect(() => {
    setTitle(page?.title ?? "");
  }, [page?.title]);

  const debouncedSave = useDebounceCallback(async (nextTitle: string) => {
    if (!editingPage?.pageId || !nextTitle.trim()) {
      return;
    }

    try {
      await updatePage({
        pageId: editingPage.pageId as Id<"pages">,
        title: nextTitle.trim(),
      });
    } catch (_error) {
      toast.error(t("renameFailed"));
    }
  }, 500);

  if (!editingPage) return null;

  return (
    <PanelFrame
      header={
        <PanelHeader>
          <div className="flex h-14 items-center justify-between gap-3 px-4">
            <input
              value={title}
              onChange={(event) => {
                setTitle(event.target.value);
                debouncedSave(event.target.value);
              }}
              placeholder={t("titlePlaceholder")}
              className="h-8 min-w-0 flex-1 border-none bg-transparent px-0 text-sm font-medium outline-none placeholder:text-muted-foreground"
            />
            <div className="flex shrink-0 items-center gap-2">
              {onToggleFullscreen ? (
                <ToolbarButton
                  onClick={onToggleFullscreen}
                  label={isFullscreen ? t("exitFullscreen") : t("fullscreen")}
                  pressed={isFullscreen}
                >
                  {isFullscreen ? (
                    <Minimize2 className="h-4 w-4" />
                  ) : (
                    <Maximize2 className="h-4 w-4" />
                  )}
                </ToolbarButton>
              ) : null}
              <ToolbarButton onClick={closePageEditor} label={t("closeEditor")}>
                <X className="h-4 w-4" />
              </ToolbarButton>
            </div>
          </div>
        </PanelHeader>
      }
    >
      <PageEditor pageId={editingPage.pageId} nested />
    </PanelFrame>
  );
}

function PanelFrame({
  header,
  children,
}: {
  header: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="relative flex h-full min-h-0 min-w-0 flex-col">
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10">
        <div className="pointer-events-auto">{header}</div>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <div className="min-h-full px-3 pb-3 pt-14 md:px-4 md:pb-4">
          {children}
        </div>
      </ScrollArea>
    </div>
  );
}

function PanelHeader({ children }: { children: ReactNode }) {
  return (
    <div className="relative isolate overflow-hidden">
      <BlurStack className="inset-x-0 top-0 h-14" direction="down" />
      <div className="absolute inset-0 bg-linear-to-b from-background/78 via-background/42 to-background/8 dark:from-background/86 dark:via-background/52 dark:to-background/12" />
      <div className="relative">{children}</div>
    </div>
  );
}

interface SiteEditorProps {
  siteId: string;
  initialPages?: Doc<"pages">[];
  initialSite?: Doc<"sites"> | null;
}

function SiteEditorInner({
  initialPages,
  initialSite,
  siteId,
}: SiteEditorProps) {
  const { team } = useTeamAccess();
  const isMobile = useIsMobile();
  const { isLoading: isConvexLoading } = useConvexAuth();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const selectedPageId = searchParams.get("page");
  const [, setSelectedSlotId] = useState<string | null>(null);
  const { selection, editingPage, closePageEditor, activeTabId, selectSlot } =
    useEditorUi();
  const { viewingPage, closePage } = usePagePanelState();

  // Fullscreen state for page panel
  const [isFullscreen, setIsFullscreen] = useState(false);

  const activePageDetail = editingPage
    ? { kind: "editor" as const }
    : viewingPage
      ? { kind: "viewer" as const }
      : null;
  const showPagePanel = activePageDetail !== null;

  // ESC key to close page panel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (editingPage) {
          closePageEditor();
          setIsFullscreen(false);
        } else if (viewingPage) {
          closePage();
          setIsFullscreen(false);
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [editingPage, closePageEditor, viewingPage, closePage]);

  const siteQuery = useQuery(api.sites.get, {
    siteId: siteId as Id<"sites">,
  });
  const pagesQuery = useQuery(api.pages.list, {
    siteId: siteId as Id<"sites">,
  });
  const site =
    isConvexLoading || siteQuery === undefined ? initialSite : siteQuery;
  const pages =
    isConvexLoading || pagesQuery === undefined ? initialPages : pagesQuery;

  // Get customization CSS variables for preview
  const { cssVariables: customizationStyles, isCustomized } =
    useSiteCustomization(siteId as Id<"sites">);

  // Create a portal container for Radix portals within the editor content area.
  // This div lives at document.body level (no layout impact) but carries the
  // customization CSS variables so portaled elements inherit the right styles.
  const portalContainer = useMemo(() => {
    if (typeof document === "undefined") {
      return undefined;
    }

    const element = document.createElement("div");
    element.id = "editor-portal-container";
    return element;
  }, []);

  // Mount/unmount the portal container element
  useEffect(() => {
    if (!portalContainer) return;

    document.body.appendChild(portalContainer);
    return () => {
      document.body.removeChild(portalContainer);
    };
  }, [portalContainer]);

  // Sync customization styles and data attribute onto the portal container
  useEffect(() => {
    if (!portalContainer) return;

    // Apply CSS variables
    for (const [key, value] of Object.entries(customizationStyles)) {
      if (typeof value === "string") {
        portalContainer.style.setProperty(key, value);
      }
    }

    if (isCustomized) {
      portalContainer.setAttribute("data-site-customized", "");
    } else {
      portalContainer.removeAttribute("data-site-customized");
    }
  }, [portalContainer, customizationStyles, isCustomized]);

  const publishSite = useMutation(api.sites.publish);
  const unpublishSite = useMutation(api.sites.unpublish);

  const handlePublish = async () => {
    try {
      await publishSite({ siteId: siteId as Id<"sites"> });
      toast.success("Site published");
    } catch (_error) {
      toast.error("Failed to publish site");
    }
  };

  const handleUnpublish = async () => {
    try {
      await unpublishSite({ siteId: siteId as Id<"sites"> });
      toast.success("Site unpublished");
    } catch (_error) {
      toast.error("Failed to unpublish site");
    }
  };

  const handleSlotSelectionChange = (slotId: string | null) => {
    setSelectedSlotId(slotId);
  };

  const replaceEditorUrl = (updates: Record<string, string | null>) => {
    const nextUrl = buildEditorPath(pathname, searchParams.toString(), updates);
    router.replace(nextUrl, { scroll: false });
  };

  const setSelectedPageId = (id: string | null) => {
    replaceEditorUrl({ page: id });
  };

  const selectedPage = selectedPageId
    ? (pages?.find((p: Doc<"pages">) => p._id === selectedPageId) ?? pages?.[0])
    : pages?.[0];

  const createLayoutMutation = useMutation(api.layouts.create);
  const addBlockMutation = useMutation(api.layouts.addBlockToSlot);
  const addPageBlockMutation = useMutation(api.layouts.addPageBlock);
  const enablePageTabsMutation = useMutation(api.pages.enablePageTabs);

  const targetPageId = editingPage
    ? (editingPage.pageId as Id<"pages">)
    : selectedPage?._id;

  const handleAddLayout = async (type: LayoutType) => {
    if (!targetPageId) return;

    const created = await createLayoutMutation({
      pageId: targetPageId,
      type,
      tabId: editingPage ? undefined : (activeTabId ?? undefined),
    });

    if (created.firstSlotId) {
      const firstSlotId = created.firstSlotId;
      setTimeout(() => {
        selectSlot(created.layoutId as string, firstSlotId);
      }, 100);
    }
  };

  const handleAddBlock = async (type: ElementType) => {
    if (!selection.layoutId || !selection.slotId) return;

    if (type === "page") {
      const blockId = nanoid(10);
      try {
        await addPageBlockMutation({
          layoutId: selection.layoutId as Id<"layouts">,
          slotId: selection.slotId,
          blockId,
          title: "New Page",
          slug: `page-${blockId.slice(0, 8)}`,
        });
      } catch (_error) {
        toast.error("Failed to create page");
      }
      return;
    }

    const content = getDefaultContent(type as ElementType);
    if (!content) return;

    const block = createBlockDraft(type as LayoutBlockType, content, () =>
      nanoid(10),
    );
    await addBlockMutation({
      layoutId: selection.layoutId as Id<"layouts">,
      slotId: selection.slotId,
      block: {
        id: block.id,
        type: block.type,
        content: block.content as AnyContent,
      },
    });
  };

  const handleEnableTabs = async () => {
    if (!targetPageId) return;

    await enablePageTabsMutation({
      pageId: targetPageId,
      tabs: [
        { id: nanoid(10), label: "Tab 1" },
        { id: nanoid(10), label: "Tab 2" },
      ],
    });
  };

  if (site === undefined || pages === undefined) {
    return <EditorLoading />;
  }

  if (!site || site.teamId !== team._id) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Site not found</p>
      </div>
    );
  }

  const railPositionClass = isMobile
    ? "pointer-events-none fixed inset-x-3 bottom-3 z-40 flex justify-center"
    : "pointer-events-none absolute inset-y-14 left-3 z-30 flex items-center sm:left-4 lg:left-6";
  const showFloatingRail = !(isMobile && showPagePanel);

  const pageEditor = selectedPage ? (
    <PageEditor
      pageId={selectedPage._id}
      onSelectionChange={handleSlotSelectionChange}
    />
  ) : (
    <div className="flex min-h-[50vh] items-center justify-center text-muted-foreground">
      Select a page to edit
    </div>
  );

  const editorCanvas = (
    <ScrollArea className="h-full min-h-0">
      <div
        className={
          showPagePanel
            ? "pr-2 pb-6 pt-18 pl-20 md:pr-2 md:pb-8 md:pt-18 md:pl-24 lg:pr-2 lg:pl-28"
            : "p-4 pt-18 pl-20 md:p-8 md:pt-18 md:pl-24 lg:pl-28"
        }
      >
        {pageEditor}
      </div>
    </ScrollArea>
  );

  if (isMobile && !showPagePanel) {
    return (
      <div
        className="w-full bg-background"
        style={customizationStyles}
        {...(isCustomized ? { "data-site-customized": "" } : {})}
      >
        <main className="relative">
          {showFloatingRail ? (
            <div className={railPositionClass}>
              <EditorFloatingRail
                site={site}
                pages={pages}
                selectedPageId={selectedPage?._id}
                selectedSlotId={selection.slotId}
                onSelectPage={setSelectedPageId}
                onAddLayout={handleAddLayout}
                onAddBlock={handleAddBlock}
                onEnableTabs={handleEnableTabs}
              />
            </div>
          ) : null}

          <EditorHeader
            inFlow
            teamSlug={team.slug}
            siteSlug={site.slug}
            siteId={site._id}
            sitePublished={site.isPublished}
            siteName={site.name}
            siteLogoUrl={site.logoUrl}
            onPublish={handlePublish}
            onUnpublish={handleUnpublish}
          />

          <PortalContainerProvider value={portalContainer}>
            <div
              className="overflow-visible p-4 pb-20"
              style={customizationStyles}
              {...(isCustomized ? { "data-site-customized": "" } : {})}
            >
              {selectedPage ? (
                <PageEditor
                  pageId={selectedPage._id}
                  onSelectionChange={handleSlotSelectionChange}
                />
              ) : (
                <div className="flex min-h-[50vh] items-center justify-center text-muted-foreground">
                  Select a page to edit
                </div>
              )}
            </div>
          </PortalContainerProvider>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        <EditorHeader
          teamSlug={team.slug}
          siteSlug={site.slug}
          siteId={site._id}
          sitePublished={site.isPublished}
          siteName={site.name}
          siteLogoUrl={site.logoUrl}
          onPublish={handlePublish}
          onUnpublish={handleUnpublish}
        />

        <div className={railPositionClass}>
          <EditorFloatingRail
            site={site}
            pages={pages}
            selectedPageId={selectedPage?._id}
            selectedSlotId={selection.slotId}
            onSelectPage={setSelectedPageId}
            onAddLayout={handleAddLayout}
            onAddBlock={handleAddBlock}
            onEnableTabs={handleEnableTabs}
          />
        </div>

        <PortalContainerProvider value={portalContainer}>
          <div
            className="absolute inset-0 min-w-0 overflow-hidden"
            style={customizationStyles}
            {...(isCustomized ? { "data-site-customized": "" } : {})}
          >
            {showPagePanel ? (
              isFullscreen || isMobile ? (
                <div className="h-full min-h-0 min-w-0">
                  <div
                    className={cn(
                      "h-full min-h-0 min-w-0 pr-2 pb-2 pt-16 md:pr-3 md:pb-3 md:pt-18 lg:pr-4 lg:pb-4",
                      isFullscreen && !isMobile && "pl-20 md:pl-24 lg:pl-28",
                    )}
                  >
                    <section className={pagePanelSurfaceClassName}>
                      {activePageDetail?.kind === "editor" ? (
                        <PageEditorPanel
                          isFullscreen={isFullscreen}
                          onToggleFullscreen={() =>
                            setIsFullscreen(!isFullscreen)
                          }
                        />
                      ) : (
                        <PublicPagePanel
                          isFullscreen={isFullscreen}
                          onToggleFullscreen={() =>
                            setIsFullscreen(!isFullscreen)
                          }
                        />
                      )}
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
                        {editorCanvas}
                      </div>
                    </ResizablePanel>
                    <ResizableHandle className={hiddenSplitHandleClassName} />
                    <ResizablePanel defaultSize={40} minSize={30}>
                      <div className="h-full min-h-0 min-w-0 pr-2 pb-2 pt-16 md:pr-3 md:pb-3 md:pt-18 lg:pr-4 lg:pb-4">
                        <section className={pagePanelSurfaceClassName}>
                          {activePageDetail?.kind === "editor" ? (
                            <PageEditorPanel
                              isFullscreen={isFullscreen}
                              onToggleFullscreen={() =>
                                setIsFullscreen(!isFullscreen)
                              }
                            />
                          ) : (
                            <PublicPagePanel
                              isFullscreen={isFullscreen}
                              onToggleFullscreen={() =>
                                setIsFullscreen(!isFullscreen)
                              }
                            />
                          )}
                        </section>
                      </div>
                    </ResizablePanel>
                  </ResizablePanelGroup>
                </div>
              )
            ) : (
              editorCanvas
            )}
          </div>
        </PortalContainerProvider>
      </main>
    </div>
  );
}

function SiteEditorShell({
  initialPages,
  initialSite,
  permissions,
  siteId,
}: SiteEditorProps & {
  permissions: {
    canEdit: boolean;
    isAdmin: boolean;
    isLoading: boolean;
  };
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const editingPageId = searchParams.get("editorPanelPage");

  const replaceEditorUrl = (updates: Record<string, string | null>) => {
    const nextUrl = buildEditorPath(pathname, searchParams.toString(), updates);
    router.replace(nextUrl, { scroll: false });
  };

  return (
    <EditorProvider
      siteId={siteId}
      permissions={permissions}
      pagePanelState={{
        editingPage: editingPageId ? { pageId: editingPageId } : null,
        openPageEditor: (page) => {
          replaceEditorUrl({ editorPanelPage: page.pageId });
        },
        closePageEditor: () => {
          replaceEditorUrl({ editorPanelPage: null });
        },
      }}
    >
      <SiteEditorInner
        initialPages={initialPages}
        initialSite={initialSite}
        siteId={siteId}
      />
    </EditorProvider>
  );
}

export function SiteEditor({
  initialPages,
  initialSite,
  siteId,
}: SiteEditorProps) {
  const { capabilities } = useTeamAccess();
  const { isLoading: isConvexLoading } = useConvexAuth();
  const siteQuery = useQuery(api.sites.get, {
    siteId: siteId as Id<"sites">,
  });
  const site =
    isConvexLoading || siteQuery === undefined ? initialSite : siteQuery;

  const permissions = {
    canEdit: capabilities.canEditContent,
    isAdmin: capabilities.canManageTeam,
    isLoading: site === undefined,
  };

  return (
    <Suspense fallback={<EditorLoading />}>
      <SiteEditorShell
        initialPages={initialPages}
        initialSite={initialSite}
        permissions={permissions}
        siteId={siteId}
      />
    </Suspense>
  );
}

function EditorLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Spinner className="size-6 text-muted-foreground" />
    </div>
  );
}
