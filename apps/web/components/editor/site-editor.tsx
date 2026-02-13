"use client";

import { getDefaultContent } from "@/components/elements";
import { PublicSubpageProvider, usePublicSubpageContext } from "@/components/public/public-subpage-context";
import { PublicSubpagePanel } from "@/components/public/public-subpage-panel";
import { EditorSkeleton } from "@/components/skeletons";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { SidebarProvider } from "@/components/ui/sidebar";
import { useSiteCustomization } from "@/hooks";
import { createBlock, createLayout, generateId } from "@/lib/layouts";
import type { AnyContent, LayoutBlockType, LayoutType } from "@/types";
import { api } from "@repo/backend";
import type { Doc, Id } from "@repo/backend";
import { useMutation, useQuery } from "convex/react";
import { useCallback, useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { PortalContainerProvider } from "@/contexts/portal-container-context";
import { EditorProvider, useEditorContext } from "./editor-context";
import { EditorHeader } from "./editor-header";
import { EditorSidebar } from "./editor-sidebar";
import { PageEditor } from "./page-editor";
import { SubpageEditPanel } from "./subpage-edit-panel";

interface SiteEditorProps {
  siteId: string;
}

// Inner component that has access to EditorContext
function SiteEditorInner({ siteId }: SiteEditorProps) {
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const { selection, selectSlot, editingSubpage, closeSubpageEditor, markContentModified, activeTabId } =
    useEditorContext();
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

  const siteData = useQuery(api.sites.queries.getWithCompany, {
    siteId: siteId as Id<"sites">,
  });
  const pages = useQuery(api.pages.queries.list, {
    siteId: siteId as Id<"sites">,
  });

  // Get customization CSS variables for preview
  const { cssVariables: customizationStyles, isCustomized } = useSiteCustomization(siteId as Id<"sites">);

  // Create a portal container for Radix portals within the editor content area.
  // This div lives at document.body level (no layout impact) but carries the
  // customization CSS variables so portaled elements inherit the right styles.
  const [portalContainer, setPortalContainer] = useState<HTMLElement | undefined>(undefined);
  const portalContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = document.createElement("div");
    el.id = "editor-portal-container";
    document.body.appendChild(el);
    portalContainerRef.current = el;
    setPortalContainer(el);

    return () => {
      document.body.removeChild(el);
      portalContainerRef.current = null;
    };
  }, []);

  // Sync customization styles and data attribute onto the portal container
  useEffect(() => {
    const el = portalContainerRef.current;
    if (!el) return;

    // Apply CSS variables
    for (const [key, value] of Object.entries(customizationStyles)) {
      if (typeof value === "string") {
        el.style.setProperty(key, value);
      }
    }

    if (isCustomized) {
      el.setAttribute("data-site-customized", "");
    } else {
      el.removeAttribute("data-site-customized");
    }
  }, [customizationStyles, isCustomized]);

  // Mutations for layouts
  const createLayoutMutation = useMutation(api.layouts.mutations.create);
  const addBlockMutation = useMutation(api.layouts.mutations.addBlockToSlot);

  const enablePageTabsMutation = useMutation(api.pages.mutations.enablePageTabs);

  const publishSite = useMutation(api.sites.mutations.publish);
  const unpublishSite = useMutation(api.sites.mutations.unpublish);

  const handlePublish = async () => {
    try {
      await publishSite({ siteId: siteId as Id<"sites"> });
      toast.success("Site published");
    } catch (error) {
      console.error("Failed to publish site:", error);
      toast.error("Failed to publish site");
    }
  };

  const handleUnpublish = async () => {
    try {
      await unpublishSite({ siteId: siteId as Id<"sites"> });
      toast.success("Site unpublished");
    } catch (error) {
      console.error("Failed to unpublish site:", error);
      toast.error("Failed to unpublish site");
    }
  };

  // Handle slot selection change from PageEditor
  const handleSlotSelectionChange = useCallback((slotId: string | null) => {
    setSelectedSlotId(slotId);
  }, []);

  // Get the currently selected page
  const selectedPage = selectedPageId
    ? pages?.find((p: Doc<"pages">) => p._id === selectedPageId)
    : pages?.[0];

  // Add layout from sidebar
  const handleAddLayout = useCallback(
    async (type: LayoutType) => {
      if (!selectedPage) return;

      const newLayout = createLayout(type);
      const layoutId = await createLayoutMutation({
        pageId: selectedPage._id as Id<"pages">,
        type: newLayout.type,
        slots: newLayout.slots,
        settings: newLayout.settings,
        tabId: activeTabId ?? undefined,
      });

      // Select the first slot of the new layout
      if (newLayout.slots.length > 0) {
        setTimeout(() => {
          selectSlot(layoutId as string, newLayout.slots[0]!.id);
          setSelectedSlotId(newLayout.slots[0]!.id);
        }, 100);
      }
    },
    [selectedPage, createLayoutMutation, selectSlot, activeTabId],
  );

  // Add block from sidebar
  const handleAddBlock = useCallback(
    async (type: LayoutBlockType) => {
      if (!selection.layoutId || !selection.slotId) return;

      const content = getDefaultContent(type);
      if (!content) {
        console.error(`No default content found for element type: ${type}`);
        return;
      }
      const newBlock = createBlock(type, content);

      await addBlockMutation({
        layoutId: selection.layoutId as Id<"layouts">,
        slotId: selection.slotId,
        block: {
          id: newBlock.id,
          type: newBlock.type,
          content: newBlock.content as AnyContent,
        },
      });
      markContentModified();
    },
    [selection, addBlockMutation, markContentModified]
  );

  // Enable page-level tabs
  const handleEnableTabs = useCallback(async () => {
    if (!selectedPage) return;
    await enablePageTabsMutation({
      pageId: selectedPage._id as Id<"pages">,
      tabs: [
        { id: generateId(), label: "Tab 1" },
        { id: generateId(), label: "Tab 2" },
      ],
    });
    markContentModified();
  }, [selectedPage, enablePageTabsMutation, markContentModified]);

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

  const { site, company } = siteData;

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full overflow-hidden">
        <EditorSidebar
          site={site}
          company={company}
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
            companySlug={company.slug}
            siteSlug={site.slug}
            siteId={site._id}
            sitePublished={site.isPublished}
            onPublish={handlePublish}
            onUnpublish={handleUnpublish}
            site={site}
            company={company}
          />

          <div className="flex-1 min-h-0 min-w-0 overflow-hidden">
            {showSubpagePanel ? (
              <ResizablePanelGroup orientation="horizontal" className="h-full">
                {/* Main content area */}
                {!isFullscreen && (
                  <>
                    <ResizablePanel defaultSize={60} minSize={20}>
                      <PortalContainerProvider value={portalContainer}>
                        <div
                          className="h-full w-full min-w-0 overflow-y-auto overflow-x-hidden p-8"
                          style={customizationStyles}
                          {...(isCustomized ? { "data-site-customized": "" } : {})}
                        >
                          {selectedPage ? (
                            <PageEditor
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
                <ResizablePanel defaultSize={isFullscreen ? 100 : 40} minSize={20}>
                  <PortalContainerProvider value={portalContainer}>
                    <div
                      className="h-full w-full min-w-0 overflow-hidden border-l"
                      style={customizationStyles}
                      {...(isCustomized ? { "data-site-customized": "" } : {})}
                    >
                      {editingSubpage ? (
                        <SubpageEditPanel
                          isFullscreen={isFullscreen}
                          onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
                        />
                      ) : (
                        <PublicSubpagePanel
                          isFullscreen={isFullscreen}
                          onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
                        />
                      )}
                    </div>
                  </PortalContainerProvider>
                </ResizablePanel>
              </ResizablePanelGroup>
            ) : (
              <PortalContainerProvider value={portalContainer}>
                <div
                  className="h-full overflow-auto p-8"
                  style={customizationStyles}
                  {...(isCustomized ? { "data-site-customized": "" } : {})}
                >
                  {selectedPage ? (
                    <PageEditor
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

// Wrapper that provides EditorContext and PublicSubpageProvider
export function SiteEditor({ siteId }: SiteEditorProps) {
  return (
    <EditorProvider siteId={siteId as Id<"sites">}>
      <PublicSubpageProvider>
        <SiteEditorInner siteId={siteId} />
      </PublicSubpageProvider>
    </EditorProvider>
  );
}
