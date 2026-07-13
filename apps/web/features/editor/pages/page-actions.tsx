"use client";

import { api } from "@baseblocks/backend";
import type { Id } from "@baseblocks/backend";
import type { PageListItem } from "@baseblocks/domain";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@baseblocks/ui/alert-dialog";
import { Button } from "@baseblocks/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@baseblocks/ui/dropdown-menu";
import { useMutation } from "convex/react";
import { FilePlus, MoreHorizontal, Star, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { CreatePageDialog } from "./create-page-dialog";

interface PageActionsMenuProps {
  page: PageListItem;
  siteId: string;
  isDefault: boolean;
  onChildCreated?: () => void;
}

export function PageActionsMenu({
  page,
  siteId,
  isDefault,
  onChildCreated,
}: PageActionsMenuProps) {
  const t = useTranslations("navigation.pageActions");
  const tDelete = useTranslations("navigation.deletePage");
  const tCommon = useTranslations("common");
  const [createChildOpen, setCreateChildOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const setDefaultPage = useMutation(api.sites.setDefaultPage);
  const removePage = useMutation(api.pages.remove);

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
            aria-label={t("triggerAriaLabel")}
            className="h-6 w-6 shrink-0 opacity-0 transition-opacity group-hover/page:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem onClick={() => setCreateChildOpen(true)}>
            <FilePlus className="h-4 w-4" />
            {t("addChildPage")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleSetDefault} disabled={isDefault}>
            <Star className="h-4 w-4" />
            {isDefault ? t("defaultPage") : t("setAsDefault")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="h-4 w-4" />
            {t("delete")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <CreatePageDialog
        onCreated={onChildCreated}
        onOpenChange={setCreateChildOpen}
        open={createChildOpen}
        parentId={page._id}
        siteId={siteId}
        trigger={null}
      />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="overflow-hidden rounded-[1.5rem] border-sidebar-border bg-sidebar p-0 text-sidebar-foreground shadow-2xl sm:max-w-[32rem]">
          <AlertDialogHeader className="px-5 pt-5 pb-0 text-left sm:text-left">
            <AlertDialogTitle className="text-base font-semibold text-balance">
              {tDelete("title")}
            </AlertDialogTitle>
            <AlertDialogDescription
              asChild
              className="text-sm text-sidebar-foreground/60"
            >
              <div className="text-pretty">
                {tDelete("description", { title: page.title })}
                {isDefault ? (
                  <span className="mt-2 block text-amber-600 dark:text-amber-400">
                    {tDelete("defaultWarning")}
                  </span>
                ) : null}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="px-5 pt-3 pb-4 sm:justify-end">
            <AlertDialogCancel
              size="sm"
              className="rounded-full border-sidebar-border/70 bg-transparent px-3.5 text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            >
              {tCommon("cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              size="sm"
              className="rounded-full px-4 text-sm"
              onClick={handleDelete}
            >
              {tDelete("confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
