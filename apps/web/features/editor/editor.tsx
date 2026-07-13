"use client";

import { cn } from "@baseblocks/ui/lib/utils";
import { EditorProvider } from "@/features/editor/editor-state";
import { useEditorUi } from "@/features/editor/editor-state";
import { PublicPagePanel } from "@/features/published-sites/page-panel";
import { getDefaultContent } from "@/components/site-elements/registry";
import { usePagePanelState } from "@/components/site-runtime/page-panel-state";
import { useTeamAccess } from "@/features/authentication/team-access";
import { api } from "@baseblocks/backend";
import type { Doc, Id } from "@baseblocks/backend";
import type {
  ElementType,
  SaveStatus,
  SectionPreset,
} from "@baseblocks/domain";
import { PortalContainerProvider } from "@baseblocks/ui/contexts/portal-container-context";
import { useIsMobile } from "@baseblocks/ui/hooks/use-mobile";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@baseblocks/ui/resizable";
import { Spinner } from "@baseblocks/ui/spinner";
import { useMutation, useQuery } from "convex/react";
import { nanoid } from "nanoid";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { PageEditor } from "@/features/editor/page/page-editor";
import { OpenEditorPageEditor } from "@/features/editor-v2/openeditor-page-editor";
import { toast } from "sonner";
import { EditorToolDock } from "./tool-dock/editor-tool-dock";
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

interface SiteEditorProps {
  siteId: string;
  engine?: "openeditor" | "legacy";
}

function SiteEditorInner({ siteId, engine = "openeditor" }: SiteEditorProps) {
  const { team } = useTeamAccess();
  const isMobile = useIsMobile();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const selectedPageId = searchParams.get("page");
  const { selection, activeTabId, selectColumn, clearSelection } =
    useEditorUi();
  const { viewingPage, closePage } = usePagePanelState();

  // Fullscreen state for page panel
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");

  const showPagePanel = viewingPage !== null;

  // ESC key to close page panel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (viewingPage) {
          closePage();
          setIsFullscreen(false);
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [viewingPage, closePage]);

  const siteQuery = useQuery(api.sites.get, {
    siteId: siteId as Id<"sites">,
  });
  const pagesQuery = useQuery(api.pages.list, {
    siteId: siteId as Id<"sites">,
  });
  const site = siteQuery;
  const pages = pagesQuery;

  const [portalContainer, setPortalContainer] = useState<HTMLDivElement | null>(
    null,
  );

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

  const replaceEditorUrl = (updates: Record<string, string | null>) => {
    const nextUrl = buildEditorPath(pathname, searchParams.toString(), updates);
    router.replace(nextUrl, { scroll: false });
  };

  const setSelectedPageId = (id: string | null) => {
    clearSelection();
    replaceEditorUrl({ page: id });
  };

  const selectedPage = selectedPageId
    ? (pages?.find((p: Doc<"pages">) => p._id === selectedPageId) ?? pages?.[0])
    : pages?.[0];

  const targetPageId = selectedPage?._id;
  const pageContent = useQuery(
    api.pageContent.get,
    targetPageId ? { pageId: targetPageId } : "skip",
  );
  const savePageContent = useMutation(api.pageContent.save);
  const createPage = useMutation(api.pages.create);

  const mutatePageContent = async (
    recipe: (content: NonNullable<typeof pageContent>) => void,
  ) => {
    if (!targetPageId || !pageContent) return;
    const next = structuredClone(pageContent);
    recipe(next);
    await savePageContent({ pageId: targetPageId, content: next });
  };

  const handleAddSection = async (preset: SectionPreset) => {
    if (!targetPageId) return;

    const firstColumnId = nanoid(10);
    await mutatePageContent((content) => {
      const region = preset === "aside" ? "aside" : "main";
      content.sections.push({
        id: nanoid(10),
        tabId: activeTabId ?? undefined,
        region,
        order: content.sections.filter((section) => section.region === region)
          .length,
        columns: Array.from(
          { length: preset === "columns" ? 2 : 1 },
          (_, order) => ({
            id: order === 0 ? firstColumnId : nanoid(10),
            order,
            blocks: [],
          }),
        ),
      });
    });
    selectColumn(firstColumnId);
  };

  const handleAddBlock = async (type: ElementType) => {
    const columnId =
      selection?.kind === "column"
        ? selection.id
        : selection?.kind === "block"
          ? selection.columnId
          : null;
    if (!columnId) return;

    if (type === "page") {
      const blockId = nanoid(10);
      try {
        const childPageId = await createPage({
          siteId: siteId as Id<"sites">,
          title: "New Page",
          slug: `page-${blockId.slice(0, 8)}`,
          parentId: targetPageId,
          showInNavigation: false,
        });
        await mutatePageContent((content) => {
          const column = content.sections
            .flatMap((section) => section.columns)
            .find((item) => item.id === columnId);
          column?.blocks.push({
            id: blockId,
            type: "page",
            content: { pageId: childPageId },
            order: column.blocks.length,
          });
        });
      } catch (_error) {
        toast.error("Failed to create page");
      }
      return;
    }

    const content = getDefaultContent(type);
    if (!content) return;

    await mutatePageContent((pageContent) => {
      const column = pageContent.sections
        .flatMap((section) => section.columns)
        .find((item) => item.id === columnId);
      column?.blocks.push({
        id: nanoid(10),
        type,
        content,
        order: column.blocks.length,
      });
    });
  };

  const handleEnableTabs = async () => {
    if (!targetPageId) return;

    await mutatePageContent((content) => {
      const tabs = [
        { id: nanoid(10), label: "Tab 1" },
        { id: nanoid(10), label: "Tab 2" },
      ];
      content.tabs = tabs;
      for (const section of content.sections) section.tabId = tabs[0]!.id;
    });
  };

  if (site === undefined || pages === undefined) {
    return <EditorLoading />;
  }

  if (!site || site.organizationId !== team._id) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Site not found</p>
      </div>
    );
  }

  const selectedColumnId =
    selection?.kind === "column"
      ? selection.id
      : selection?.kind === "block"
        ? selection.columnId
        : null;

  const pageEditor = selectedPage ? (
    engine === "legacy" ? (
      <PageEditor key={selectedPage._id} pageId={selectedPage._id} />
    ) : (
      <OpenEditorPageEditor
        key={selectedPage._id}
        onSaveStatusChange={setSaveStatus}
        pageId={selectedPage._id}
        pages={pages}
        preview={isPreviewing}
        siteId={site._id}
      />
    )
  ) : (
    <div className="flex min-h-[50vh] items-center justify-center text-muted-foreground">
      Select a page to edit
    </div>
  );

  const editorCanvas = (
    <div className="h-full min-h-0 overflow-auto md:pl-14 lg:pl-0">
      <div
        className={
          showPagePanel
            ? "pr-2 pb-6 pt-18 md:pr-2 md:pb-8 md:pt-18 lg:pr-2"
            : "p-4 pt-18 md:p-8 md:pt-18"
        }
      >
        {pageEditor}
      </div>
    </div>
  );

  if (isMobile && !showPagePanel) {
    return (
      <div className="w-full bg-background">
        <EditorToolDock
          engine={engine}
          site={site}
          pages={pages}
          selectedPageId={selectedPage?._id}
          selectedColumnId={selectedColumnId}
          onSelectPage={setSelectedPageId}
          onAddSection={handleAddSection}
          onAddBlock={handleAddBlock}
          onEnableTabs={handleEnableTabs}
        />
        <div
          ref={setPortalContainer}
          className="pointer-events-none fixed inset-0 z-50 [&>*]:pointer-events-auto"
        />
        <main className="relative min-w-0 w-full overflow-hidden">
          <EditorHeader
            engine={engine}
            inFlow
            teamSlug={team.slug}
            siteSlug={site.slug}
            siteId={site._id}
            sitePublished={site.isPublished}
            siteName={site.name}
            siteLogoUrl={site.logoUrl}
            saveStatus={engine === "openeditor" ? saveStatus : "idle"}
            onPublish={handlePublish}
            isPreviewing={isPreviewing}
            onTogglePreview={() => setIsPreviewing((current) => !current)}
            onUnpublish={handleUnpublish}
          />
          <PortalContainerProvider value={portalContainer ?? undefined}>
            <div className="overflow-visible p-4 pb-20">{pageEditor}</div>
          </PortalContainerProvider>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <EditorToolDock
        engine={engine}
        site={site}
        pages={pages}
        selectedPageId={selectedPage?._id}
        selectedColumnId={selectedColumnId}
        onSelectPage={setSelectedPageId}
        onAddSection={handleAddSection}
        onAddBlock={handleAddBlock}
        onEnableTabs={handleEnableTabs}
      />
      <div
        ref={setPortalContainer}
        className="pointer-events-none fixed inset-0 z-50 [&>*]:pointer-events-auto"
      />
      <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        <EditorHeader
          engine={engine}
          teamSlug={team.slug}
          siteSlug={site.slug}
          siteId={site._id}
          sitePublished={site.isPublished}
          siteName={site.name}
          siteLogoUrl={site.logoUrl}
          saveStatus={engine === "openeditor" ? saveStatus : "idle"}
          onPublish={handlePublish}
          isPreviewing={isPreviewing}
          onTogglePreview={() => setIsPreviewing((current) => !current)}
          onUnpublish={handleUnpublish}
        />

        <PortalContainerProvider value={portalContainer ?? undefined}>
          <div className="absolute inset-0 min-w-0 overflow-hidden">
            {showPagePanel ? (
              isFullscreen || isMobile ? (
                <div className="h-full min-h-0 min-w-0">
                  <div
                    className={cn(
                      "h-full min-h-0 min-w-0 pr-2 pb-2 pt-16 md:pr-3 md:pb-3 md:pt-18 lg:pr-4 lg:pb-4",
                      isFullscreen && !isMobile && "pl-2 md:pl-14 lg:pl-4",
                    )}
                  >
                    <section className={pagePanelSurfaceClassName}>
                      <PublicPagePanel
                        isFullscreen={isFullscreen}
                        onToggleFullscreen={() =>
                          setIsFullscreen(!isFullscreen)
                        }
                      />
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
                          <PublicPagePanel
                            isFullscreen={isFullscreen}
                            onToggleFullscreen={() =>
                              setIsFullscreen(!isFullscreen)
                            }
                          />
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
  permissions,
  siteId,
  engine,
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

  const replaceEditorUrl = (updates: Record<string, string | null>) => {
    const nextUrl = buildEditorPath(pathname, searchParams.toString(), updates);
    router.replace(nextUrl, { scroll: false });
  };

  return (
    <EditorProvider
      siteId={siteId}
      permissions={permissions}
      onOpenPage={(pageId) => replaceEditorUrl({ page: pageId })}
    >
      <SiteEditorInner engine={engine} siteId={siteId} />
    </EditorProvider>
  );
}

export function SiteEditor({ siteId, engine = "openeditor" }: SiteEditorProps) {
  const { capabilities } = useTeamAccess();
  const siteQuery = useQuery(api.sites.get, {
    siteId: siteId as Id<"sites">,
  });
  const site = siteQuery;

  const permissions = {
    canEdit: capabilities.canEditContent,
    isAdmin: capabilities.canManageTeam,
    isLoading: site === undefined,
  };

  return (
    <Suspense fallback={<EditorLoading />}>
      <SiteEditorShell
        engine={engine}
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
