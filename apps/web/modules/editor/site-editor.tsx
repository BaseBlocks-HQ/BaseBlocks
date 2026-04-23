"use client";

import { EditorSkeleton } from "@/components/skeletons";
import { usePages } from "@/lib/data/use-page";
import { useSite } from "@/lib/data/use-site";
import { buildPathWithUpdatedSearchParams } from "@/lib/url-search-params";
import { useHaptic } from "@/lib/use-haptic";
import { BlockClipboardProvider } from "@/modules/editor/contexts/block-clipboard-context";
import { useSiteCustomization } from "@/modules/elements/panels/customization/use-site-customization";
import { PublicPagePanel } from "@/modules/public-site/public-page-panel";
import {
  PublicPagePanelProvider,
  usePublicPagePanel,
} from "@/modules/public-site/public-page-panel-context";
import { EditorProvider } from "@/modules/shared/contexts/editor-context";
import { useEditorUi } from "@/modules/shared/contexts/editor-context";
import { useTeamAccess } from "@/modules/team/team-access";
import { api } from "@baseblocks/backend";
import type { Doc, Id } from "@baseblocks/backend";
import { PortalContainerProvider } from "@baseblocks/ui/contexts/portal-container-context";
import { useIsMobile } from "@baseblocks/ui/hooks/use-mobile";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@baseblocks/ui/resizable";
import { ScrollArea } from "@baseblocks/ui/scroll-area";
import { useConvexAuth, useMutation } from "convex/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ConnectedPageBlockEditPanel,
  ConnectedPageEditor,
} from "./components/connected-editors";
import { EditorFloatingRail } from "./editor-floating-rail";
import { EditorHeader } from "./editor-header";
import { useSidebarOperations } from "./hooks/use-sidebar-operations";
import { ConvexEditorMutationsProvider } from "./mutations-bridge";

interface SiteEditorProps {
  siteId: string;
  initialPages?: Doc<"pages">[];
  initialSite?: Doc<"sites"> | null;
}

const elementModuleLoaders = [
  () => import("@/modules/elements/layouts"),
  () => import("@/modules/elements/blocks"),
  () => import("@/modules/elements/sections"),
  () => import("@/modules/elements/media"),
];

/**
 * Lazily loads element registration modules via dynamic import().
 * In dev mode this defers compilation of 100+ element files until after
 * the editor shell is already visible, cutting initial load from ~48s to ~2s.
 */
function useElementsLoader() {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all(elementModuleLoaders.map((loadModule) => loadModule())).then(
      () => {
        if (!cancelled) setLoaded(true);
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);

  return loaded;
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
  const { selection, editingPage, closePageEditor } = useEditorUi();
  const { viewingPage, closePage } = usePublicPagePanel();

  // Fullscreen state for page panel
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Determine if any page panel should be shown
  const showPagePanel = editingPage || viewingPage;

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

  const siteQuery = useSite(siteId);
  const pagesQuery = usePages(siteId);
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

  const haptic = useHaptic();
  const publishSite = useMutation(api.sites.mutations.publish);
  const unpublishSite = useMutation(api.sites.mutations.unpublish);

  const handlePublish = async () => {
    try {
      await publishSite({ siteId: siteId as Id<"sites"> });
      haptic.trigger("success");
      toast.success("Site published");
    } catch (_error) {
      haptic.trigger("error");
      toast.error("Failed to publish site");
    }
  };

  const handleUnpublish = async () => {
    try {
      await unpublishSite({ siteId: siteId as Id<"sites"> });
      haptic.trigger("warning");
      toast.success("Site unpublished");
    } catch (_error) {
      haptic.trigger("error");
      toast.error("Failed to unpublish site");
    }
  };

  const handleSlotSelectionChange = (slotId: string | null) => {
    setSelectedSlotId(slotId);
  };

  const replaceEditorUrl = (updates: Record<string, string | null>) => {
    const nextUrl = buildPathWithUpdatedSearchParams(
      pathname,
      searchParams.toString(),
      updates,
    );
    router.replace(nextUrl, { scroll: false });
  };

  const setSelectedPageId = (id: string | null) => {
    replaceEditorUrl({ page: id });
  };

  const selectedPage = selectedPageId
    ? (pages?.find((p: Doc<"pages">) => p._id === selectedPageId) ?? pages?.[0])
    : pages?.[0];

  const { handleAddLayout, handleAddBlock, handleEnableTabs } =
    useSidebarOperations({
      selectedPageId: selectedPage?._id,
    });

  if (site === undefined || pages === undefined) {
    return <EditorSkeleton />;
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

  if (isMobile && !showPagePanel) {
    return (
      <div
        className="w-full bg-background"
        style={customizationStyles}
        {...(isCustomized ? { "data-site-customized": "" } : {})}
      >
        <main className="relative">
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
                <ConnectedPageEditor
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

        <div className="absolute inset-0 min-w-0 overflow-hidden">
          {showPagePanel ? (
            <ResizablePanelGroup orientation="horizontal" className="h-full">
              {/* Main content area */}
              {!isFullscreen && (
                <>
                  <ResizablePanel defaultSize={58} minSize={30}>
                    <PortalContainerProvider value={portalContainer}>
                      <ScrollArea className="h-full w-full min-h-0 min-w-0">
                        <div
                          className="p-4 pt-18 pl-20 md:p-8 md:pt-18 md:pl-24 lg:pl-28"
                          style={customizationStyles}
                          {...(isCustomized
                            ? { "data-site-customized": "" }
                            : {})}
                        >
                          {selectedPage ? (
                            <ConnectedPageEditor
                              pageId={selectedPage._id}
                              onSelectionChange={handleSlotSelectionChange}
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center text-muted-foreground">
                              Select a page to edit
                            </div>
                          )}
                        </div>
                      </ScrollArea>
                    </PortalContainerProvider>
                  </ResizablePanel>
                  <ResizableHandle withHandle />
                </>
              )}
              {/* Page panel - editing takes priority over viewing */}
              <ResizablePanel
                defaultSize={isFullscreen ? 100 : 42}
                minSize={30}
              >
                <PortalContainerProvider value={portalContainer}>
                  <div
                    className="h-full w-full min-w-0 overflow-hidden border-l pt-14"
                    style={customizationStyles}
                    {...(isCustomized ? { "data-site-customized": "" } : {})}
                  >
                    {editingPage ? (
                      <ConnectedPageBlockEditPanel
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
                  </div>
                </PortalContainerProvider>
              </ResizablePanel>
            </ResizablePanelGroup>
          ) : (
            <PortalContainerProvider value={portalContainer}>
              <ScrollArea className="h-full min-h-0">
                <div
                  className="p-4 pt-18 pl-20 md:p-8 md:pt-18 md:pl-24 lg:pl-28"
                  style={customizationStyles}
                  {...(isCustomized ? { "data-site-customized": "" } : {})}
                >
                  {selectedPage ? (
                    <ConnectedPageEditor
                      pageId={selectedPage._id}
                      onSelectionChange={handleSlotSelectionChange}
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground">
                      Select a page to edit
                    </div>
                  )}
                </div>
              </ScrollArea>
            </PortalContainerProvider>
          )}
        </div>
      </main>
    </div>
  );
}

function SiteEditorShell({
  initialPages,
  initialSite,
  permissions,
  siteData,
  siteId,
}: SiteEditorProps & {
  permissions: {
    canEdit: boolean;
    isAdmin: boolean;
    isLoading: boolean;
  };
  siteData?: {
    teamId?: string;
    contentModifiedAt?: number;
    lastDeployedAt?: number;
  };
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const editingPageId = searchParams.get("editorPanelPage");

  const replaceEditorUrl = (updates: Record<string, string | null>) => {
    const nextUrl = buildPathWithUpdatedSearchParams(
      pathname,
      searchParams.toString(),
      updates,
    );
    router.replace(nextUrl, { scroll: false });
  };

  return (
    <ConvexEditorMutationsProvider>
      <EditorProvider
        siteId={siteId}
        site={siteData}
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
        <BlockClipboardProvider>
          <PublicPagePanelProvider>
            <SiteEditorInner
              initialPages={initialPages}
              initialSite={initialSite}
              siteId={siteId}
            />
          </PublicPagePanelProvider>
        </BlockClipboardProvider>
      </EditorProvider>
    </ConvexEditorMutationsProvider>
  );
}

export function SiteEditor({
  initialPages,
  initialSite,
  siteId,
}: SiteEditorProps) {
  const elementsLoaded = useElementsLoader();
  const { capabilities } = useTeamAccess();
  const { isLoading: isConvexLoading } = useConvexAuth();
  const siteQuery = useSite(siteId);
  const site =
    isConvexLoading || siteQuery === undefined ? initialSite : siteQuery;

  const siteData = site
    ? {
        teamId: site.teamId as string,
        contentModifiedAt: site.contentModifiedAt,
        lastDeployedAt: site.lastDeployedAt,
      }
    : undefined;

  const permissions = {
    canEdit: capabilities.canEditContent,
    isAdmin: capabilities.canManageTeam,
    isLoading: site === undefined,
  };

  if (!elementsLoaded) {
    return <EditorSkeleton />;
  }

  return (
    <Suspense fallback={<EditorSkeleton />}>
      <SiteEditorShell
        initialPages={initialPages}
        initialSite={initialSite}
        permissions={permissions}
        siteData={siteData}
        siteId={siteId}
      />
    </Suspense>
  );
}
