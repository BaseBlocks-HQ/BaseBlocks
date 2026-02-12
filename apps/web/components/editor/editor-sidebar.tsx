"use client";

import { CreatePageDialog } from "@/components/dialogs";
import { NavItem, SortablePageTree } from "@/components/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
} from "@/components/ui/sidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePageExpandState, useSiteCustomization } from "@/hooks";
import { getDisplayDomain } from "@/lib/utils";
import type { LayoutBlockType, LayoutType, PageListItem, PageWithChildren } from "@/types";
import type { ElementType } from "@/types/elements";
import type { Id } from "@repo/backend";
import { ArrowLeft } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useEditorContext } from "./editor-context";
import { ElementPicker } from "./element-picker";

function buildPageTree(pages: PageListItem[]): PageWithChildren[] {
  const map = new Map<string, PageWithChildren>();
  const roots: PageWithChildren[] = [];

  for (const page of pages) {
    map.set(page._id, { ...page, children: [] });
  }

  for (const page of pages) {
    const node = map.get(page._id)!;
    if (page.parentId && map.has(page.parentId)) {
      map.get(page.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  for (const node of map.values()) {
    node.children.sort((a, b) => a.order - b.order);
  }

  return roots.sort((a, b) => a.order - b.order);
}

interface EditorSidebarProps {
  site: {
    _id: string;
    name: string;
    logoUrl?: string;
    isPublished: boolean;
    defaultPageId?: string;
  };
  company: {
    slug: string;
  };
  pages: PageListItem[];
  selectedPageId?: string;
  selectedSlotId?: string | null;
  onSelectPage: (pageId: string) => void;
  onAddLayout?: (type: LayoutType) => void;
  onAddBlock?: (type: LayoutBlockType) => void;
  onEnableTabs?: () => void;
}

export function EditorSidebar({
  site,
  company,
  pages,
  selectedPageId,
  selectedSlotId,
  onSelectPage,
  onAddLayout,
  onAddBlock,
  onEnableTabs,
}: EditorSidebarProps) {
  const t = useTranslations();
  const { canEdit, selection, siteId } = useEditorContext();
  const [activeTab, setActiveTab] = useState("pages");
  const { isExpanded, toggleExpand, setExpanded } = usePageExpandState(
    site._id,
  );

  // Customization + page tree for preview tab
  const { cssVariables: customizationStyles, isCustomized } = useSiteCustomization(siteId);
  const pageTree = useMemo(() => buildPageTree(pages), [pages]);

  // Auto-switch to components tab when a slot or block is selected
  useEffect(() => {
    if (selection.slotId || selection.blockId) {
      setActiveTab("components");
    }
  }, [selection.slotId, selection.blockId]);

  const handleSelectPage = (pageId: string) => {
    onSelectPage(pageId);
  };

  const rootPages = pages
    .filter((p) => !p.parentId)
    .sort((a, b) => a.order - b.order);

  return (
    <Sidebar>
      <SidebarHeader className="border-b h-14 px-4 flex items-center">
        <div className="flex items-center gap-2 w-full">
          <Link href="/dashboard">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          {/* Site logo */}
          {site.logoUrl ? (
            <img
              src={site.logoUrl}
              alt={site.name}
              className="h-8 w-8 rounded-lg object-contain border bg-muted flex-shrink-0"
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold flex-shrink-0">
              {site.name[0]?.toUpperCase() || "S"}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold truncate">{site.name}</h2>
            <p className="text-xs text-muted-foreground truncate">
              {getDisplayDomain(company.slug)}
            </p>
          </div>
        </div>
      </SidebarHeader>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex-1 flex flex-col"
      >
        <div className="px-2 pt-2">
          <TabsList className="w-full">
            <TabsTrigger value="pages" className="flex-1">
              {t("editor.sidebar.pagesTab")}
            </TabsTrigger>
            <TabsTrigger value="components" className="flex-1">
              {t("editor.sidebar.componentsTab")}
            </TabsTrigger>
            <TabsTrigger value="preview" className="flex-1">
              {t("editor.sidebar.previewTab")}
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="pages" className="flex-1 mt-0">
          <SidebarContent>
            <SidebarGroup>
              <div className="flex items-center justify-between px-2">
                <SidebarGroupLabel>
                  {t("editor.sidebar.pagesTab")}
                </SidebarGroupLabel>
                {canEdit && <CreatePageDialog siteId={site._id} />}
              </div>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SortablePageTree
                    pages={rootPages}
                    allPages={pages}
                    selectedPageId={selectedPageId}
                    siteId={site._id}
                    defaultPageId={site.defaultPageId}
                    onSelect={handleSelectPage}
                    isExpanded={isExpanded}
                    onToggleExpand={toggleExpand}
                    onSetExpanded={setExpanded}
                  />
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </TabsContent>

        <TabsContent
          value="components"
          className="flex-1 mt-0 overflow-visible"
        >
          <SidebarContent className="overflow-visible">
            {!canEdit ? (
              <div className="p-4">
                <p className="text-sm text-muted-foreground">
                  {t("editor.sidebar.viewOnly")}
                </p>
              </div>
            ) : selectedPageId ? (
              <ElementPicker
                siteId={site._id as Id<"sites">}
                selectedSlotId={selectedSlotId}
                onAddLayout={onAddLayout}
                onAddBlock={(type: ElementType) =>
                  onAddBlock?.(type as LayoutBlockType)
                }
                onEnableTabs={onEnableTabs}
              />
            ) : (
              <div className="p-4">
                <p className="text-sm text-muted-foreground">
                  {t("editor.sidebar.selectPage")}
                </p>
              </div>
            )}
          </SidebarContent>
        </TabsContent>

        <TabsContent value="preview" className="flex-1 mt-0 overflow-hidden">
          <div
            className="h-full flex flex-col"
            style={customizationStyles}
            {...(isCustomized ? { "data-site-customized": "" } : {})}
          >
            <div className="px-3 pt-2 pb-1">
              <Badge
                variant="secondary"
                className="text-[10px] px-1.5 py-0"
              >
                Sidebar Preview
              </Badge>
            </div>
            <ScrollArea className="flex-1">
              <nav className="space-y-1 p-4">
                {pageTree.map((page) => (
                  <NavItem
                    key={page._id}
                    page={page}
                    selectedPageId={selectedPageId}
                    mode="preview"
                    onSelect={handleSelectPage}
                  />
                ))}
              </nav>
            </ScrollArea>
          </div>
        </TabsContent>
      </Tabs>
    </Sidebar>
  );
}
