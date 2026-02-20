"use client";

import { CustomizationConfigPanel } from "@/features/elements/customization";
// Direct imports — avoid the @/features/elements barrel which triggers
// eager registration of ALL element modules (100+ files).
import { ElementEditorWrapper } from "@/features/elements/element-editor-wrapper";
import { LayoutContextProvider } from "@/features/elements/layout-context";
import { NavigationConfigPanel } from "@/features/elements/navigation";
import {
  getDefaultContent,
  getElementConfigPanel,
  getElementsByCategory,
  hasElementConfigPanel,
} from "@/features/elements/registry";
import { SiteConfigPanel } from "@/features/elements/site";
import {
  BlocksIcon,
  CustomizationIcon,
  FormsIcon,
  LayoutsIcon,
  MediaIcon,
  NavIcon,
  SectionsIcon,
  SiteSettingsIcon,
} from "@/components/icons";

import {
  PublicSubpageProvider,
  usePublicSubpageContext,
} from "@/features/public-site/public-subpage-context";
import { PublicSubpagePanel } from "@/features/public-site/public-subpage-panel";
import { EditorSkeleton } from "@/components/skeletons";
import { useSiteCustomization } from "@/hooks";
import { api } from "@baseblocks/backend";
import type { Doc, Id } from "@baseblocks/backend";
import {
  type EditorElementsBridge,
  EditorElementsBridgeProvider,
  EditorProvider,
  PageEditor,
  SubpageEditPanel,
  useEditorContext,
} from "@baseblocks/editor";
import {
  createBlock,
  createLayout,
  generateId,
} from "@baseblocks/editor/layouts";
import type {
  AnyContent,
  ElementCategory,
  ElementType,
  LayoutBlockType,
  LayoutType,
} from "@baseblocks/types";
import { PortalContainerProvider } from "@baseblocks/ui/contexts/portal-container-context";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@baseblocks/ui/resizable";
import { SidebarProvider } from "@baseblocks/ui/sidebar";
import { useMutation, useQuery } from "convex/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { EditorHeader } from "./editor-header";
import { EditorSidebar } from "./editor-sidebar";

interface SiteEditorProps {
  siteId: string;
}

/**
 * Lazily loads element registration modules via dynamic import().
 * In dev mode this defers compilation of 100+ element files until after
 * the editor shell is already visible, cutting initial load from ~48s to ~2s.
 */
function useElementsLoader() {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      import("@/features/elements/layouts"),
      import("@/features/elements/blocks"),
      import("@/features/elements/sections"),
      import("@/features/elements/media"),
      import("@/features/elements/forms"),
    ]).then(() => {
      if (!cancelled) setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return loaded;
}

// Inner component that has access to EditorContext
function SiteEditorInner({ siteId }: SiteEditorProps) {
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const {
    selection,
    selectSlot,
    editingSubpage,
    closeSubpageEditor,
    activeTabId,
    pushCommand,
    isUndoRedoExecuting,
    currentPageId,
  } = useEditorContext();
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

  const siteData = useQuery(api.sites.queries.getWithTeam, {
    siteId: siteId as Id<"sites">,
  });
  const pages = useQuery(api.pages.queries.list, {
    siteId: siteId as Id<"sites">,
  });

  // Get customization CSS variables for preview
  const { cssVariables: customizationStyles, isCustomized } =
    useSiteCustomization(siteId as Id<"sites">);

  // Create a portal container for Radix portals within the editor content area.
  // This div lives at document.body level (no layout impact) but carries the
  // customization CSS variables so portaled elements inherit the right styles.
  const [portalContainer, setPortalContainer] = useState<
    HTMLElement | undefined
  >(undefined);
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
  const addSubpageBlockMutation = useMutation(
    api.layouts.mutations.addSubpageBlock,
  );
  const removeLayoutMutation = useMutation(api.layouts.mutations.remove);
  const removeBlockMutation = useMutation(
    api.layouts.mutations.removeBlockFromSlot,
  );

  const enablePageTabsMutation = useMutation(
    api.pages.mutations.enablePageTabs,
  );

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
      // When editing a subpage, add the layout to the subpage instead of the parent page
      const targetPageId = editingSubpage
        ? (editingSubpage.pageId as Id<"pages">)
        : selectedPage?._id;

      if (!targetPageId) return;

      const newLayout = createLayout(type);
      const pageIdStr = targetPageId as string;
      const layoutId = await createLayoutMutation({
        pageId: targetPageId as Id<"pages">,
        type: newLayout.type,
        slots: newLayout.slots,
        settings: newLayout.settings,
        tabId: editingSubpage ? undefined : (activeTabId ?? undefined),
      });

      // Select the first slot of the new layout
      if (newLayout.slots.length > 0) {
        setTimeout(() => {
          selectSlot(layoutId as string, newLayout.slots[0]!.id);
          setSelectedSlotId(newLayout.slots[0]!.id);
        }, 100);
      }

      if (!isUndoRedoExecuting) {
        const layoutIdRef = { value: layoutId as string };
        pushCommand({
          description: `Add ${type} layout`,
          pageId: pageIdStr,
          undo: async () => {
            await removeLayoutMutation({
              layoutId: layoutIdRef.value as Id<"layouts">,
            });
          },
          redo: async () => {
            const newId = await createLayoutMutation({
              pageId: targetPageId as Id<"pages">,
              type: newLayout.type,
              slots: newLayout.slots,
              settings: newLayout.settings,
              tabId: editingSubpage ? undefined : (activeTabId ?? undefined),
            });
            layoutIdRef.value = newId as string;
          },
        });
      }
    },
    [
      selectedPage,
      editingSubpage,
      createLayoutMutation,
      removeLayoutMutation,
      selectSlot,
      activeTabId,
      pushCommand,
      isUndoRedoExecuting,
    ],
  );

  // Add block from sidebar
  const handleAddBlock = useCallback(
    async (type: ElementType) => {
      if (!selection.layoutId || !selection.slotId) return;

      // Special case: subpage blocks create a real child page atomically
      if (type === "subpage") {
        const blockId = generateId();
        const title = "New Sub-page";
        const slug = `sub-page-${blockId.slice(0, 8)}`;

        try {
          await addSubpageBlockMutation({
            layoutId: selection.layoutId as Id<"layouts">,
            slotId: selection.slotId,
            blockId,
            title,
            slug,
          });
          // Block is added to the current page's content — no navigation
        } catch (error) {
          console.error("Failed to add subpage block:", error);
          toast.error("Failed to create sub-page");
        }
        return;
      }

      const content = getDefaultContent(type);
      if (!content) {
        console.error(`No default content found for element type: ${type}`);
        return;
      }
      const newBlock = createBlock(type as LayoutBlockType, content);
      const layoutId = selection.layoutId;
      const slotId = selection.slotId;

      await addBlockMutation({
        layoutId: layoutId as Id<"layouts">,
        slotId,
        block: {
          id: newBlock.id,
          type: newBlock.type,
          content: newBlock.content as AnyContent,
        },
      });

      if (!isUndoRedoExecuting && currentPageId) {
        pushCommand({
          description: `Add ${type} block`,
          pageId: currentPageId,
          undo: async () => {
            await removeBlockMutation({
              layoutId: layoutId as Id<"layouts">,
              slotId,
              blockId: newBlock.id,
            });
          },
          redo: async () => {
            await addBlockMutation({
              layoutId: layoutId as Id<"layouts">,
              slotId,
              block: {
                id: newBlock.id,
                type: newBlock.type,
                content: newBlock.content as AnyContent,
              },
            });
          },
        });
      }
    },
    [
      selection,
      addBlockMutation,
      addSubpageBlockMutation,
      removeBlockMutation,
      pushCommand,
      isUndoRedoExecuting,
      currentPageId,
    ],
  );

  // Enable page-level tabs
  const handleEnableTabs = useCallback(async () => {
    const targetPageId = editingSubpage
      ? (editingSubpage.pageId as Id<"pages">)
      : selectedPage?._id;

    if (!targetPageId) return;
    await enablePageTabsMutation({
      pageId: targetPageId as Id<"pages">,
      tabs: [
        { id: generateId(), label: "Tab 1" },
        { id: generateId(), label: "Tab 2" },
      ],
    });
  }, [selectedPage, editingSubpage, enablePageTabsMutation]);

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
            site={site}
            team={team}
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
                        <SubpageEditPanel
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

// Category icon mapping (passed to editor via bridge)
const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  site: <SiteSettingsIcon className="h-5 w-5" />,
  navigation: <NavIcon className="h-5 w-5" />,
  layouts: <LayoutsIcon className="h-5 w-5" />,
  sections: <SectionsIcon className="h-5 w-5" />,
  blocks: <BlocksIcon className="h-5 w-5" />,
  media: <MediaIcon className="h-5 w-5" />,
  forms: <FormsIcon className="h-5 w-5" />,
  customization: <CustomizationIcon className="h-5 w-5" />,
};

// Wrapper that provides EditorContext, elements bridge, and PublicSubpageProvider
export function SiteEditor({ siteId }: SiteEditorProps) {
  const elementsLoaded = useElementsLoader();

  const elementsBridge = useMemo<EditorElementsBridge>(
    () => ({
      ElementWrapper: ElementEditorWrapper,
      LayoutContextProvider,
      getConfigPanel: (type: string) =>
        getElementConfigPanel(type as ElementType) ?? null,
      hasConfigPanel: (type: string) =>
        hasElementConfigPanel(type as ElementType),
      getElementsByCategory: (category: string) =>
        getElementsByCategory(category as ElementCategory),
      categoryIcons: CATEGORY_ICONS,
      panels: {
        customization: CustomizationConfigPanel,
        navigation: NavigationConfigPanel,
        site: SiteConfigPanel,
      },
    }),
    [],
  );

  if (!elementsLoaded) {
    return <EditorSkeleton />;
  }

  return (
    <EditorProvider siteId={siteId as Id<"sites">}>
      <EditorElementsBridgeProvider bridge={elementsBridge}>
        <PublicSubpageProvider>
          <SiteEditorInner siteId={siteId} />
        </PublicSubpageProvider>
      </EditorElementsBridgeProvider>
    </EditorProvider>
  );
}
