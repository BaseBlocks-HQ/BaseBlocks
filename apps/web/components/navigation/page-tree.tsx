"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@repo/backend";
import type { Id } from "@repo/backend";
import { FileText, Home, MoreHorizontal, Pencil, Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { RenamePageDialog, ConfirmDialog } from "@/components/dialogs";
import type { PageListItem } from "@/types";

interface PageTreeItemProps {
  page: PageListItem;
  allPages: PageListItem[];
  selectedPageId?: string;
  siteId: string;
  defaultPageId?: string;
  depth?: number;
  onSelect: (pageId: string) => void;
}

export function PageTreeItem({
  page,
  allPages,
  selectedPageId,
  siteId,
  defaultPageId,
  depth = 0,
  onSelect,
}: PageTreeItemProps) {
  const children = allPages
    .filter((p) => p.parentId === page._id)
    .sort((a, b) => a.order - b.order);

  const isDefault = defaultPageId === page._id;

  return (
    <>
      <SidebarMenuItem className="group/page">
        <div className="flex items-center w-full">
          <SidebarMenuButton
            isActive={selectedPageId === page._id}
            onClick={() => onSelect(page._id)}
            className="flex-1"
            style={{ paddingLeft: `${(depth + 1) * 12}px` }}
          >
            {isDefault ? (
              <Home className="h-4 w-4 text-primary" />
            ) : (
              <FileText className="h-4 w-4" />
            )}
            <span className="truncate">{page.title}</span>
          </SidebarMenuButton>
          <PageActionsMenu
            page={page}
            siteId={siteId}
            isDefault={isDefault}
          />
        </div>
      </SidebarMenuItem>
      {children.map((child) => (
        <PageTreeItem
          key={child._id}
          page={child}
          allPages={allPages}
          selectedPageId={selectedPageId}
          siteId={siteId}
          defaultPageId={defaultPageId}
          depth={depth + 1}
          onSelect={onSelect}
        />
      ))}
    </>
  );
}

function PageActionsMenu({
  page,
  siteId,
  isDefault,
}: {
  page: PageListItem;
  siteId: string;
  isDefault: boolean;
}) {
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const setDefaultPage = useMutation(api.sites.mutations.setDefaultPage);
  const removePage = useMutation(api.pages.mutations.remove);

  const handleSetDefault = async () => {
    await setDefaultPage({
      siteId: siteId as Id<"sites">,
      pageId: page._id as Id<"pages">,
    });
  };

  const handleDelete = async () => {
    await removePage({ pageId: page._id as Id<"pages"> });
    setDeleteOpen(false);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-0 group-hover/page:opacity-100 transition-opacity"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={() => setRenameOpen(true)}>
            <Pencil className="h-4 w-4" />
            Rename
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleSetDefault} disabled={isDefault}>
            <Star className="h-4 w-4" />
            {isDefault ? "Default Page" : "Set as Default"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <RenamePageDialog
        page={page}
        open={renameOpen}
        onOpenChange={setRenameOpen}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Page"
        description={
          <>
            Are you sure you want to delete &ldquo;{page.title}&rdquo;? This
            will also delete all content and child pages. This action cannot be
            undone.
            {isDefault && (
              <span className="block mt-2 text-amber-600 dark:text-amber-400">
                This is the default page. A new default will be assigned
                automatically.
              </span>
            )}
          </>
        }
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </>
  );
}
