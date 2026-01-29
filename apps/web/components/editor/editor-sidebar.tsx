"use client";

import { CreatePageDialog } from "@/components/dialogs";
import { SortablePageTree } from "@/components/navigation";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
import { getDisplayDomain } from "@/lib/utils";
import { SECTION_TYPES } from "@/types";
import type { BlockType, PageListItem, SectionLayout } from "@/types";
import {
  AlertTriangle,
  ArrowLeft,
  ChevronDown,
  Code,
  Columns3,
  FolderOpen,
  Heading,
  LayoutGrid,
  Link2,
  Minus,
  MoveVertical,
  Rows3,
  Search,
  Square,
  Text,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

interface EditorSidebarProps {
  site: {
    _id: string;
    name: string;
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
  rows: <Rows3 className="h-4 w-4" />,
  columns: <Columns3 className="h-4 w-4" />,
  grid: <LayoutGrid className="h-4 w-4" />,
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
    type: "document-library",
    label: "Document Library",
    icon: <FolderOpen className="h-4 w-4" />,
  },
  {
    type: "search",
    label: "Document Search",
    icon: <Search className="h-4 w-4" />,
  },
  {
    type: "quicklinks",
    label: "Quick Links",
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
  const [activeTab, setActiveTab] = useState("pages");
  const [sectionsOpen, setSectionsOpen] = useState(true);
  const [blocksOpen, setBlocksOpen] = useState(true);

  const handleSelectPage = (pageId: string) => {
    onSelectPage(pageId);
  };

  const rootPages = pages
    .filter((p) => !p.parentId)
    .sort((a, b) => a.order - b.order);

  return (
    <Sidebar>
      <SidebarHeader className="border-b p-4">
        <div className="flex items-center gap-2">
          <Link href="/dashboard">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
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
              Pages
            </TabsTrigger>
            <TabsTrigger value="components" className="flex-1">
              Components
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="pages" className="flex-1 mt-0">
          <SidebarContent>
            <SidebarGroup>
              <div className="flex items-center justify-between px-2">
                <SidebarGroupLabel>Pages</SidebarGroupLabel>
                <CreatePageDialog siteId={site._id} />
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
                  />
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </TabsContent>

        <TabsContent value="components" className="flex-1 mt-0 overflow-auto">
          <SidebarContent>
            {selectedPageId ? (
              <>
                {/* Sections */}
                <Collapsible
                  open={sectionsOpen}
                  onOpenChange={setSectionsOpen}
                  className="border-b"
                >
                  <CollapsibleTrigger asChild>
                    <div className="flex items-center justify-between px-4 py-2 hover:bg-muted/50 cursor-pointer">
                      <span className="text-sm font-medium">Sections</span>
                      <ChevronDown
                        className={`h-4 w-4 transition-transform ${
                          sectionsOpen ? "" : "-rotate-90"
                        }`}
                      />
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="px-2 pb-3 space-y-1">
                      <p className="text-xs text-muted-foreground px-2 mb-2">
                        Layout containers for your content
                      </p>
                      {SECTION_TYPES.map((sectionType) => (
                        <Button
                          key={sectionType.type}
                          variant="ghost"
                          className="w-full justify-start"
                          size="sm"
                          onClick={() => onAddSection?.(sectionType.type)}
                        >
                          {SECTION_ICONS[sectionType.type]}
                          <span className="ml-2">{sectionType.label}</span>
                        </Button>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                {/* Blocks */}
                <Collapsible open={blocksOpen} onOpenChange={setBlocksOpen}>
                  <CollapsibleTrigger asChild>
                    <div className="flex items-center justify-between px-4 py-2 hover:bg-muted/50 cursor-pointer">
                      <span className="text-sm font-medium">Blocks</span>
                      <ChevronDown
                        className={`h-4 w-4 transition-transform ${
                          blocksOpen ? "" : "-rotate-90"
                        }`}
                      />
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="px-2 pb-3 space-y-1">
                      {selectedSlotId ? (
                        <>
                          <p className="text-xs text-muted-foreground px-2 mb-2">
                            Click to add to selected slot
                          </p>
                          {BLOCK_ITEMS.map((item) => (
                            <Button
                              key={item.type}
                              variant="ghost"
                              className="w-full justify-start"
                              size="sm"
                              onClick={() => onAddBlock?.(item.type)}
                            >
                              {item.icon}
                              <span className="ml-2">{item.label}</span>
                            </Button>
                          ))}
                        </>
                      ) : (
                        <p className="text-xs text-muted-foreground px-2">
                          Add a section first, then click on a slot to add
                          blocks
                        </p>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </>
            ) : (
              <div className="p-4">
                <p className="text-sm text-muted-foreground">
                  Select a page to add components
                </p>
              </div>
            )}
          </SidebarContent>
        </TabsContent>
      </Tabs>
    </Sidebar>
  );
}
