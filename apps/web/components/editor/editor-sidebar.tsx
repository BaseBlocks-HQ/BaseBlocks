"use client";

import { CreatePageDialog } from "@/components/dialogs";
import { SortablePageTree } from "@/components/navigation";
import { Button } from "@/components/ui/button";
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
import { usePageExpandState } from "@/hooks";
import { getDisplayDomain } from "@/lib/utils";
import { useEditorContext } from "./editor-context";
import { SECTION_TYPES } from "@/types";
import type { BlockType, PageListItem, SectionLayout } from "@/types";
import {
  AlertTriangle,
  ArrowLeft,
  Code,
  Columns2,
  FolderOpen,
  Heading,
  LayoutGrid,
  Link2,
  Minus,
  MoveVertical,
  Rows2,
  Search,
  Square,
  Text,
} from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useState } from "react";

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
  onAddSection?: (type: SectionLayout) => void;
  onAddBlock?: (type: BlockType) => void;
}

const SECTION_ICONS: Record<SectionLayout, React.ReactNode> = {
  single: <Square className="h-4 w-4" />,
  rows: <Rows2 className="h-4 w-4" />,
  columns: <Columns2 className="h-4 w-4" />,
  grid: <LayoutGrid className="h-4 w-4" />,
  spacer: <MoveVertical className="h-4 w-4" />,
};

const BLOCK_ITEMS: Array<{
  type: BlockType;
  label: string;
  icon: React.ReactNode;
}> = [
  { type: "heading", label: "Heading", icon: <Heading className="h-4 w-4" /> },
  { type: "paragraph", label: "Paragraph", icon: <Text className="h-4 w-4" /> },
  {
    type: "callout",
    label: "Callout",
    icon: <AlertTriangle className="h-4 w-4" />,
  },
  { type: "code", label: "Code", icon: <Code className="h-4 w-4" /> },
  { type: "divider", label: "Divider", icon: <Minus className="h-4 w-4" /> },
  {
    type: "spacer",
    label: "Spacer",
    icon: <MoveVertical className="h-4 w-4" />,
  },
  {
    type: "library",
    label: "Library",
    icon: <FolderOpen className="h-4 w-4" />,
  },
  {
    type: "search",
    label: "Search",
    icon: <Search className="h-4 w-4" />,
  },
  {
    type: "quicklinks",
    label: "Quicklinks",
    icon: <Link2 className="h-4 w-4" />,
  },
];

export function EditorSidebar({
  site,
  company,
  pages,
  selectedPageId,
  selectedSlotId,
  onSelectPage,
  onAddSection,
  onAddBlock,
}: EditorSidebarProps) {
  const t = useTranslations();
  const { canEdit } = useEditorContext();
  const [activeTab, setActiveTab] = useState("pages");
  const { isExpanded, toggleExpand, setExpanded } = usePageExpandState(
    site._id,
  );

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
          </TabsList>
        </div>

        <TabsContent value="pages" className="flex-1 mt-0">
          <SidebarContent>
            <SidebarGroup>
              <div className="flex items-center justify-between px-2">
                <SidebarGroupLabel>{t("editor.sidebar.pagesTab")}</SidebarGroupLabel>
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

        <TabsContent value="components" className="flex-1 mt-0 overflow-auto">
          <SidebarContent>
            {!canEdit ? (
              <div className="p-4">
                <p className="text-sm text-muted-foreground">
                  {t("editor.sidebar.viewOnly")}
                </p>
              </div>
            ) : selectedPageId ? (
              <div className="p-3 space-y-4">
                {/* Sections - 3 per row with labels below icon */}
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2 px-1">
                    {t("editor.sidebar.sections")}
                  </p>
                  <div className="grid grid-cols-3 gap-1.5">
                    {SECTION_TYPES.map((sectionType) => (
                      <Button
                        key={sectionType.type}
                        variant="outline"
                        className="h-auto w-full flex-col gap-1 py-2 px-1 overflow-hidden"
                        onClick={() => onAddSection?.(sectionType.type)}
                      >
                        {SECTION_ICONS[sectionType.type]}
                        <span className="text-[10px] w-full text-center truncate">{t(`editor.sections.${sectionType.type}`)}</span>
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Blocks - 3 per row with labels below icon */}
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2 px-1">
                    {t("editor.sidebar.blocks")}
                  </p>
                  {selectedSlotId ? (
                    <div className="grid grid-cols-3 gap-1.5">
                      {BLOCK_ITEMS.map((item) => (
                        <Button
                          key={item.type}
                          variant="outline"
                          className="h-auto w-full flex-col gap-1 py-2 px-1 overflow-hidden"
                          onClick={() => onAddBlock?.(item.type)}
                        >
                          {item.icon}
                          <span className="text-[10px] w-full text-center truncate">{t(`blocks.${item.type}`)}</span>
                        </Button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground px-1">
                      {t("editor.sidebar.selectSlot")}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-4">
                <p className="text-sm text-muted-foreground">
                  {t("editor.sidebar.selectPage")}
                </p>
              </div>
            )}
          </SidebarContent>
        </TabsContent>
      </Tabs>
    </Sidebar>
  );
}
