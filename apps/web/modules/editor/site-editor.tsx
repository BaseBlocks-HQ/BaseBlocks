"use client";

import { CustomizationConfigPanel } from "@/modules/elements/customization";
// Direct imports — avoid the @/modules/elements barrel which triggers
// eager registration of ALL element modules (100+ files).
import { ElementEditorWrapper } from "@/modules/elements/element-editor-wrapper";
import {
  BlocksIcon,
  CustomizationIcon,
  FormsIcon,
  LayoutsIcon,
  MediaIcon,
  NavIcon,
  SectionsIcon,
  SiteSettingsIcon,
} from "@/modules/elements/icons";
import { LayoutContextProvider } from "@/modules/elements/layout-context";
import { NavigationConfigPanel } from "@/modules/elements/navigation";
import {
  getDefaultContent,
  getElementConfigPanel,
  getElementsByCategory,
  hasElementConfigPanel,
} from "@/modules/elements/registry";
import { SiteConfigPanel } from "@/modules/elements/site";

import { EditorSkeleton } from "@/components/skeletons";
import { useSiteCustomization } from "@/hooks/use-site-customization";
import {
  PublicSubpageProvider,
  usePublicSubpageContext,
} from "@/modules/public-site/public-subpage-context";
import { PublicSubpagePanel } from "@/modules/public-site/public-subpage-panel";
import { api } from "@baseblocks/backend";
import type { Doc, Id } from "@baseblocks/backend";
import {
  type EditorElementsBridge,
  EditorElementsBridgeProvider,
  type EditorMutations,
  EditorMutationsProvider,
  EditorProvider,
  PageEditor,
  SubpageEditPanel,
  useEditorContext,
} from "@baseblocks/editor";
import type { LayoutDoc, PageData } from "@baseblocks/editor";
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
      import("@/modules/elements/layouts"),
      import("@/modules/elements/blocks"),
      import("@/modules/elements/sections"),
      import("@/modules/elements/media"),
      import("@/modules/elements/forms"),
    ]).then(() => {
      if (!cancelled) setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return loaded;
}

/**
 * Bridges all Convex mutations into the backend-agnostic EditorMutations interface.
 */
function ConvexEditorMutationsProvider({
  children,
}: { children: React.ReactNode }) {
  // Layout mutations
  const createLayoutMut = useMutation(api.layouts.mutations.create);
  const removeLayoutMut = useMutation(api.layouts.mutations.remove);
  const reorderLayoutsMut = useMutation(api.layouts.mutations.reorder);
  const updateBlockMut = useMutation(api.layouts.mutations.updateBlockInSlot);
  const removeBlockMut = useMutation(api.layouts.mutations.removeBlockFromSlot);
  const addBlockMut = useMutation(api.layouts.mutations.addBlockToSlot);
  const moveBlockMut = useMutation(api.layouts.mutations.moveBlock);
  const updateSettingsMut = useMutation(api.layouts.mutations.updateSettings);

  // Page mutations
  const updatePageTabsMut = useMutation(api.pages.mutations.updatePageTabs);
  const disablePageTabsMut = useMutation(api.pages.mutations.disablePageTabs);
  const enablePageTabsMut = useMutation(api.pages.mutations.enablePageTabs);
  const updatePageMut = useMutation(api.pages.mutations.update);

  // Deployment mutations
  const deployMut = useMutation(api.deployments.mutations.deploy);
  const rollbackMut = useMutation(api.deployments.mutations.rollback);

  // Sharing mutations
  const updateVisibilityMut = useMutation(
    api.sharing.mutations.updateVisibility,
  );
  const updateAccessSettingsMut = useMutation(
    api.sharing.mutations.updateAccessSettings,
  );
  const generateNewCodeMut = useMutation(
    api.sharing.mutations.generateNewAccessCode,
  );

  const mutations = useMemo<EditorMutations>(
    () => ({
      layouts: {
        create: async (args) => {
          const id = await createLayoutMut({
            pageId: args.pageId as Id<"pages">,
            type: args.type as LayoutType,
            slots: args.slots as Parameters<typeof createLayoutMut>[0]["slots"],
            settings: args.settings,
            tabId: args.tabId,
          });
          return id as string;
        },
        remove: async (args) => {
          await removeLayoutMut({
            layoutId: args.layoutId as Id<"layouts">,
          });
        },
        reorder: async (args) => {
          await reorderLayoutsMut({
            pageId: args.pageId as Id<"pages">,
            layoutIds: args.layoutIds as Id<"layouts">[],
          });
        },
        updateBlockInSlot: async (args) => {
          await updateBlockMut({
            layoutId: args.layoutId as Id<"layouts">,
            slotId: args.slotId,
            blockId: args.blockId,
            content: args.content,
          });
        },
        removeBlockFromSlot: async (args) => {
          await removeBlockMut({
            layoutId: args.layoutId as Id<"layouts">,
            slotId: args.slotId,
            blockId: args.blockId,
          });
        },
        addBlockToSlot: async (args) => {
          await addBlockMut({
            layoutId: args.layoutId as Id<"layouts">,
            slotId: args.slotId,
            block: args.block as Parameters<typeof addBlockMut>[0]["block"],
            index: args.index,
          });
        },
        moveBlock: async (args) => {
          await moveBlockMut({
            layoutId: args.layoutId as Id<"layouts">,
            fromSlotId: args.fromSlotId,
            toSlotId: args.toSlotId,
            blockId: args.blockId,
            toIndex: args.toIndex,
          });
        },
        updateSettings: async (args) => {
          await updateSettingsMut({
            layoutId: args.layoutId as Id<"layouts">,
            settings: args.settings,
          });
        },
      },
      pages: {
        updatePageTabs: async (args) => {
          await updatePageTabsMut({
            pageId: args.pageId as Id<"pages">,
            pageTabs: args.pageTabs,
          });
        },
        disablePageTabs: async (args) => {
          await disablePageTabsMut({
            pageId: args.pageId as Id<"pages">,
          });
        },
        enablePageTabs: async (args) => {
          await enablePageTabsMut({
            pageId: args.pageId as Id<"pages">,
            tabs: args.tabs,
          });
        },
        update: async (args) => {
          await updatePageMut({
            pageId: args.pageId as Id<"pages">,
            title: args.title,
          });
        },
      },
      deployments: {
        deploy: async (args) => {
          await deployMut({
            siteId: args.siteId as Id<"sites">,
            notes: args.notes,
          });
        },
        rollback: async (args) => {
          await rollbackMut({
            siteId: args.siteId as Id<"sites">,
            targetDeploymentId: args.targetDeploymentId as Id<"deployments">,
          });
        },
      },
      sharing: {
        updateVisibility: async (args) => {
          await updateVisibilityMut({
            siteId: args.siteId as Id<"sites">,
            visibility: args.visibility as Parameters<
              typeof updateVisibilityMut
            >[0]["visibility"],
          });
        },
        updateAccessSettings: async (args) => {
          await updateAccessSettingsMut({
            siteId: args.siteId as Id<"sites">,
            accessCodeRotationHours: args.accessCodeRotationHours,
            accessCodeSessionDays: args.accessCodeSessionDays,
          });
        },
        generateNewAccessCode: async (args) => {
          await generateNewCodeMut({
            siteId: args.siteId as Id<"sites">,
          });
        },
      },
    }),
    [
      createLayoutMut,
      removeLayoutMut,
      reorderLayoutsMut,
      updateBlockMut,
      removeBlockMut,
      addBlockMut,
      moveBlockMut,
      updateSettingsMut,
      updatePageTabsMut,
      disablePageTabsMut,
      enablePageTabsMut,
      updatePageMut,
      deployMut,
      rollbackMut,
      updateVisibilityMut,
      updateAccessSettingsMut,
      generateNewCodeMut,
    ],
  );

  return (
    <EditorMutationsProvider mutations={mutations}>
      {children}
    </EditorMutationsProvider>
  );
}

/** Fetches page + layouts data from Convex and renders PageEditor */
function ConnectedPageEditor({
  pageId,
  onSelectionChange,
  nested,
}: {
  pageId: string;
  onSelectionChange?: (slotId: string | null) => void;
  nested?: boolean;
}) {
  const rawPage = useQuery(api.pages.queries.get, {
    pageId: pageId as Id<"pages">,
  });
  const rawLayouts = useQuery(api.layouts.queries.list, {
    pageId: pageId as Id<"pages">,
  });

  const pageData: PageData | undefined = rawPage
    ? { title: rawPage.title, pageTabs: rawPage.pageTabs ?? [] }
    : rawPage === null
      ? undefined
      : undefined;

  const layouts: LayoutDoc[] | undefined = rawLayouts?.map((l) => ({
    _id: l._id as string,
    type: l.type as LayoutType,
    order: l.order,
    tabId: l.tabId,
    slots: l.slots.map((s) => ({
      id: s.id,
      position: s.position,
      blocks: s.blocks.map((b) => ({
        id: b.id,
        type: b.type,
        content: b.content,
      })),
    })),
    settings: l.settings,
  }));

  return (
    <PageEditor
      pageId={pageId}
      pageData={rawPage === undefined ? undefined : (pageData ?? undefined)}
      layouts={layouts}
      onSelectionChange={onSelectionChange}
      nested={nested}
    />
  );
}

/** Fetches subpage title from Convex and renders SubpageEditPanel */
function ConnectedSubpageEditPanel({
  isFullscreen,
  onToggleFullscreen,
}: {
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}) {
  const { editingSubpage } = useEditorContext();
  const page = useQuery(
    api.pages.queries.get,
    editingSubpage?.pageId
      ? { pageId: editingSubpage.pageId as Id<"pages"> }
      : "skip",
  );

  return (
    <SubpageEditPanel
      pageTitle={page?.title}
      renderPageEditor={(pageId) => (
        <ConnectedPageEditor pageId={pageId} nested />
      )}
      isFullscreen={isFullscreen}
      onToggleFullscreen={onToggleFullscreen}
    />
  );
}

// Inner component that has access to EditorContext
function SiteEditorInner({ siteId }: SiteEditorProps) {
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [, setSelectedSlotId] = useState<string | null>(null);
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

  // Mutations for sidebar add-layout / add-block (these stay here since they
  // use selection state and app-level concerns like subpage blocks)
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

// Wrapper that provides EditorContext, elements bridge, mutations, and PublicSubpageProvider
export function SiteEditor({ siteId }: SiteEditorProps) {
  const elementsLoaded = useElementsLoader();

  // Fetch site data for EditorProvider props
  const site = useQuery(api.sites.queries.get, {
    siteId: siteId as Id<"sites">,
  });

  // Fetch user role for permissions
  const myRole = useQuery(
    api.members.queries.getMyRole,
    site?.teamId ? { teamId: site.teamId } : "skip",
  );

  const siteData = useMemo(
    () =>
      site
        ? {
            teamId: site.teamId as string,
            contentModifiedAt: site.contentModifiedAt,
            lastDeployedAt: site.lastDeployedAt,
          }
        : undefined,
    [site],
  );

  const permissions = useMemo(
    () => ({
      canEdit: myRole?.role === "admin",
      isAdmin: myRole?.role === "admin",
      isViewer: myRole?.role === "viewer",
      isLoading: myRole === undefined || site === undefined,
    }),
    [myRole, site],
  );

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
        customization:
          CustomizationConfigPanel as unknown as React.ComponentType<{
            siteId: string;
          }>,
        navigation: NavigationConfigPanel as unknown as React.ComponentType<{
          siteId: string;
        }>,
        site: SiteConfigPanel as unknown as React.ComponentType<{
          siteId: string;
        }>,
      },
    }),
    [],
  );

  if (!elementsLoaded) {
    return <EditorSkeleton />;
  }

  return (
    <ConvexEditorMutationsProvider>
      <EditorProvider siteId={siteId} site={siteData} permissions={permissions}>
        <EditorElementsBridgeProvider bridge={elementsBridge}>
          <PublicSubpageProvider>
            <SiteEditorInner siteId={siteId} />
          </PublicSubpageProvider>
        </EditorElementsBridgeProvider>
      </EditorProvider>
    </ConvexEditorMutationsProvider>
  );
}
