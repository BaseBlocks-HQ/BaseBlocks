"use client";

import { ConfirmDialog } from "@/components/dialogs";
import { useEditorSite } from "@/modules/shared/contexts/editor-context";
import { api } from "@baseblocks/backend";
import type { Id } from "@baseblocks/backend";
import type { PageListItem } from "@baseblocks/types";
import { Button } from "@baseblocks/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@baseblocks/ui/dropdown-menu";
import { useMutation } from "convex/react";
import {
  FilePlus,
  Lock,
  MoreHorizontal,
  Pencil,
  Star,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { CreateSubPageDialog } from "./create-sub-page-dialog";
import { PageAccessDialog } from "./page-access-dialog";
import { RenamePageDialog } from "./rename-page-dialog";

interface PageActionsMenuProps {
  page: PageListItem;
  siteId: string;
  isDefault: boolean;
  onExpandParent?: () => void;
}

export function PageActionsMenu({
  page,
  siteId,
  isDefault,
  onExpandParent,
}: PageActionsMenuProps) {
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [subPageOpen, setSubPageOpen] = useState(false);
  const [accessOpen, setAccessOpen] = useState(false);
  const { isAdmin } = useEditorSite();

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
            className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 opacity-0 group-hover/page:opacity-100 transition-opacity"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={() => setSubPageOpen(true)}>
            <FilePlus className="h-4 w-4" />
            Add Sub-page
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setRenameOpen(true)}>
            <Pencil className="h-4 w-4" />
            Rename
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setAccessOpen(true)}>
            <Lock className="h-4 w-4" />
            Access
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

      <CreateSubPageDialog
        siteId={siteId}
        parentId={page._id}
        parentTitle={page.title}
        open={subPageOpen}
        onOpenChange={setSubPageOpen}
        onSuccess={() => onExpandParent?.()}
      />

      <RenamePageDialog
        page={page}
        open={renameOpen}
        onOpenChange={setRenameOpen}
      />

      <PageAccessDialog
        isAdmin={isAdmin}
        open={accessOpen}
        onOpenChange={setAccessOpen}
        page={page}
        siteId={siteId}
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
