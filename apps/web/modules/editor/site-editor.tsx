"use client";

import { EditorSkeleton } from "@/components/skeletons";
import { useMemberRole, usePages, useSite, useSiteWithTeam } from "@/lib/data";
import { useSiteCustomization } from "@/modules/elements/panels/customization/use-site-customization";
import {
  PublicSubpageProvider,
  usePublicSubpageContext,
} from "@/modules/public-site/public-subpage-context";
import { PublicSubpagePanel } from "@/modules/public-site/public-subpage-panel";
import { useEditorContext } from "@/modules/shared/contexts/editor-context";
import { EditorProvider } from "@/modules/shared/contexts/editor-context";
import { api } from "@baseblocks/backend";
import type { Doc, Id } from "@baseblocks/backend";
import { PortalContainerProvider } from "@baseblocks/ui/contexts/portal-container-context";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@baseblocks/ui/resizable";
import { SidebarProvider } from "@baseblocks/ui/sidebar";
import { useMutation } from "convex/react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ConnectedPageEditor,
  ConnectedSubpageEditPanel,
} from "./components/connected-editors";
import { EditorHeader } from "./editor-header";
import { EditorSidebar } from "./editor-sidebar";
import { useSidebarOperations } from "./hooks/use-sidebar-operations";
import { ConvexEditorMutationsProvider } from "./mutations-bridge";

interface SiteEditorProps {
  siteId: string;
}

const elementModuleLoaders = [
  () => import("@/modules/elements/layouts"),
  () => import("@/modules/elements/blocks"),
  () => import("@/modules/elements/sections"),
  () => import("@/modules/elements/media"),
  () => import("@/modules/elements/forms"),
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

function SiteEditorInner({ siteId }: SiteEditorProps) {
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [, setSelectedSlotId] = useState<string | null>(null);
  const { selection, editingSubpage, closeSubpageEditor } = useEditorContext();
  const { viewingSubpage, closeSubpage } = usePublicSubpageContext();

  // Fullscreen state for subpage panel
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Determine if any subpage panel should be shown
  const showSubpagePanel = editingSubpage || viewingSubpage;

  // ESC key to close subpage panel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (editingSubpage) {
          closeSubpageEditor();
          setIsFullscreen(false);
        } else if (viewingSubpage) {
          closeSubpage();
          setIsFullscreen(false);
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [editingSubpage, closeSubpageEditor, viewingSubpage, closeSubpage]);

  const siteData = useSiteWithTeam(siteId);
  const pages = usePages(siteId);

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

  const publishSite = useMutation(api.sites.mutations.publish);
  const unpublishSite = useMutation(api.sites.mutations.unpublish);

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

  const selectedPage = selectedPageId
    ? pages?.find((p: Doc<"pages">) => p._id === selectedPageId)
    : pages?.[0];

  const { handleAddLayout, handleAddBlock, handleEnableTabs } =
    useSidebarOperations({
      selectedPageId: selectedPage?._id,
    });

  if (siteData === undefined || pages === undefined) {
    return <EditorSkeleton />;
  }

  if (!siteData) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Site not found</p>
      </div>
    );
  }

  const { site, team } = siteData;

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full overflow-hidden">
        <EditorSidebar
          site={site}
          team={team}
          pages={pages}
          selectedPageId={selectedPage?._id}
          selectedSlotId={selection.slotId}
          onSelectPage={setSelectedPageId}
          onAddLayout={handleAddLayout}
          onAddBlock={handleAddBlock}
          onEnableTabs={handleEnableTabs}
        />

        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <EditorHeader
            teamSlug={team.slug}
            siteSlug={site.slug}
            siteId={site._id}
            sitePublished={site.isPublished}
            onPublish={handlePublish}
            onUnpublish={handleUnpublish}
          />

          <div className="flex-1 min-h-0 min-w-0 overflow-hidden">
            {showSubpagePanel ? (
              <ResizablePanelGroup orientation="horizontal" className="h-full">
                {/* Main content area */}
                {!isFullscreen && (
                  <>
                    <ResizablePanel defaultSize={58} minSize={30}>
                      <PortalContainerProvider value={portalContainer}>
                        <div
                          className="h-full w-full min-w-0 overflow-y-auto overflow-x-hidden p-4 md:p-8"
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
                            <div className="flex items-center justify-center h-full text-muted-foreground">
                              Select a page to edit
                            </div>
                          )}
                        </div>
                      </PortalContainerProvider>
                    </ResizablePanel>
                    <ResizableHandle withHandle />
                  </>
                )}
                {/* Subpage panel - editing takes priority over viewing */}
                <ResizablePanel
                  defaultSize={isFullscreen ? 100 : 42}
                  minSize={30}
                >
                  <PortalContainerProvider value={portalContainer}>
                    <div
                      className="h-full w-full min-w-0 overflow-hidden border-l"
                      style={customizationStyles}
                      {...(isCustomized ? { "data-site-customized": "" } : {})}
                    >
                      {editingSubpage ? (
                        <ConnectedSubpageEditPanel
                          isFullscreen={isFullscreen}
                          onToggleFullscreen={() =>
                            setIsFullscreen(!isFullscreen)
                          }
                        />
                      ) : (
                        <PublicSubpagePanel
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
                <div
                  className="h-full overflow-auto p-4 md:p-8"
                  style={customizationStyles}
                  {...(isCustomized ? { "data-site-customized": "" } : {})}
                >
                  {selectedPage ? (
                    <ConnectedPageEditor
                      pageId={selectedPage._id}
                      onSelectionChange={handleSlotSelectionChange}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      Select a page to edit
                    </div>
                  )}
                </div>
              </PortalContainerProvider>
            )}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}

export function SiteEditor({ siteId }: SiteEditorProps) {
  const elementsLoaded = useElementsLoader();

  // Fetch site data for EditorProvider props
  const site = useSite(siteId);

  // Fetch user role for permissions
  const myRole = useMemberRole(site?.teamId);

  const siteData = site
    ? {
        teamId: site.teamId as string,
        contentModifiedAt: site.contentModifiedAt,
        lastDeployedAt: site.lastDeployedAt,
      }
    : undefined;

  const permissions = {
    canEdit: myRole?.role === "admin",
    isAdmin: myRole?.role === "admin",
    isViewer: myRole?.role === "viewer",
    isLoading: myRole === undefined || site === undefined,
  };

  if (!elementsLoaded) {
    return <EditorSkeleton />;
  }

  return (
    <ConvexEditorMutationsProvider>
      <EditorProvider siteId={siteId} site={siteData} permissions={permissions}>
        <PublicSubpageProvider>
          <SiteEditorInner siteId={siteId} />
        </PublicSubpageProvider>
      </EditorProvider>
    </ConvexEditorMutationsProvider>
  );
}
