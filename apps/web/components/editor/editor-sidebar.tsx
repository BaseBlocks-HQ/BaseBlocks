"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation } from "convex/react";
import { api } from "@repo/backend";
import type { Id } from "@repo/backend";
import {
  AlertTriangle,
  ArrowLeft,
  Code,
  FolderOpen,
  Heading,
  Link2,
  Minus,
  MoveVertical,
  Search,
  Text,
} from "lucide-react";
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
import { CreatePageDialog } from "@/components/dialogs";
import { SortablePageTree } from "@/components/navigation";
import { getDisplayDomain } from "@/lib/utils";
import type { PageListItem, BlockType } from "@/types";

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
  onSelectPage: (pageId: string) => void;
}

export function EditorSidebar({
  site,
  company,
  pages,
  selectedPageId,
  onSelectPage,
}: EditorSidebarProps) {
  const [activeTab, setActiveTab] = useState("pages");
  const createBlock = useMutation(api.blocks.mutations.create);

  const handleAddBlock = async (type: BlockType) => {
    if (!selectedPageId) return;

    const content = getDefaultBlockContent(type);
    await createBlock({
      pageId: selectedPageId as Id<"pages">,
      type,
      content,
    });
  };

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

        <TabsContent value="components" className="flex-1 mt-0">
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel className="px-2">Add to Page</SidebarGroupLabel>
              <SidebarGroupContent className="px-2">
                {selectedPageId ? (
                  <div className="space-y-1">
                    <BlockButton
                      icon={<Heading className="h-4 w-4" />}
                      label="Heading"
                      onClick={() => handleAddBlock("heading")}
                    />
                    <BlockButton
                      icon={<Text className="h-4 w-4" />}
                      label="Paragraph"
                      onClick={() => handleAddBlock("paragraph")}
                    />
                    <BlockButton
                      icon={<AlertTriangle className="h-4 w-4" />}
                      label="Callout"
                      onClick={() => handleAddBlock("callout")}
                    />
                    <BlockButton
                      icon={<Code className="h-4 w-4" />}
                      label="Code"
                      onClick={() => handleAddBlock("code")}
                    />
                    <BlockButton
                      icon={<Minus className="h-4 w-4" />}
                      label="Divider"
                      onClick={() => handleAddBlock("divider")}
                    />
                    <BlockButton
                      icon={<MoveVertical className="h-4 w-4" />}
                      label="Spacer"
                      onClick={() => handleAddBlock("spacer")}
                    />
                    <BlockButton
                      icon={<FolderOpen className="h-4 w-4" />}
                      label="Document Library"
                      onClick={() => handleAddBlock("document-library")}
                    />
                    <BlockButton
                      icon={<Search className="h-4 w-4" />}
                      label="Document Search"
                      onClick={() => handleAddBlock("search")}
                    />
                    <BlockButton
                      icon={<Link2 className="h-4 w-4" />}
                      label="Quick Links"
                      onClick={() => handleAddBlock("quicklinks")}
                    />
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground px-2">
                    Select a page first
                  </p>
                )}
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </TabsContent>
      </Tabs>
    </Sidebar>
  );
}

function BlockButton({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <Button
      variant="ghost"
      className="w-full justify-start"
      size="sm"
      onClick={onClick}
    >
      {icon}
      <span className="ml-2">{label}</span>
    </Button>
  );
}

function getDefaultBlockContent(type: BlockType) {
  switch (type) {
    case "heading":
      return { text: "New Heading", level: 2 };
    case "paragraph":
      return { text: "" };
    case "divider":
      return {};
    case "spacer":
      return { height: "medium" };
    case "callout":
      return { text: "", variant: "info" };
    case "code":
      return { text: "", language: "typescript" };
    case "document-library":
      return { displayStyle: "list", showFolderTree: true, allowDownloads: true };
    case "search":
      return { placeholder: "Search documents...", maxResults: 10, showFileType: true };
    case "quicklinks":
      return { links: [] };
    default:
      return { text: "" };
  }
}
