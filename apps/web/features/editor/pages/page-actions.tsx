"use client";

import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import {
  Delete01Icon,
  FileAddIcon,
  MoreHorizontalIcon,
  PencilEdit01Icon,
  StarIcon,
} from "@hugeicons/core-free-icons";
import { api } from "@baseblocks/backend";
import type { Id } from "@baseblocks/backend";
import type { PageListItem } from "@baseblocks/domain";
import { ActionRowAction, ActionRowActions } from "@baseblocks/ui/action-row";
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
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@baseblocks/ui/context-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@baseblocks/ui/dropdown-menu";
import { useMutation } from "convex/react";
import { useTranslations } from "next-intl";
import { type ReactNode, useRef, useState } from "react";
import { CreatePageDialog } from "./create-page-dialog";

interface PageActionsMenusProps {
  children: (menuTrigger: ReactNode) => ReactNode;
  page: PageListItem;
  siteId: string;
  isDefault: boolean;
  onChildCreated?: () => void;
  onRename: () => void;
  onReturnFocus: () => void;
}

type MenuCloseFocus = "preserve" | "rename" | "row";

export function PageActionsMenus({
  children,
  page,
  siteId,
  isDefault,
  onChildCreated,
  onRename,
  onReturnFocus,
}: PageActionsMenusProps) {
  const t = useTranslations("navigation.pageActions");
  const tDelete = useTranslations("navigation.deletePage");
  const tCommon = useTranslations("common");
  const [createChildOpen, setCreateChildOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const closeFocus = useRef<MenuCloseFocus>("row");

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

  const actions: Array<{
    disabled?: boolean;
    icon: IconSvgElement;
    id: string;
    label: string;
    onSelect: () => void;
    variant?: "destructive";
  }> = [
    {
      id: "add-child",
      icon: FileAddIcon,
      label: t("addChildPage"),
      onSelect: () => {
        closeFocus.current = "preserve";
        setCreateChildOpen(true);
      },
    },
    {
      id: "rename",
      icon: PencilEdit01Icon,
      label: t("rename"),
      onSelect: () => {
        closeFocus.current = "rename";
      },
    },
    {
      id: "set-default",
      disabled: isDefault,
      icon: StarIcon,
      label: isDefault ? t("defaultPage") : t("setAsDefault"),
      onSelect: () => void handleSetDefault(),
    },
    {
      id: "delete",
      icon: Delete01Icon,
      label: t("delete"),
      onSelect: () => {
        closeFocus.current = "preserve";
        setDeleteOpen(true);
      },
      variant: "destructive" as const,
    },
  ];

  const prepareMenu = (open: boolean) => {
    if (!open) return;
    closeFocus.current = "row";
  };

  const handleInteractOutside = () => {
    closeFocus.current = "preserve";
  };

  const handleCloseAutoFocus = (event: Event) => {
    event.preventDefault();

    if (closeFocus.current === "rename") {
      onRename();
    } else if (closeFocus.current === "row") {
      onReturnFocus();
    }

    closeFocus.current = "row";
  };

  return (
    <>
      <DropdownMenu onOpenChange={prepareMenu}>
        <ContextMenu onOpenChange={prepareMenu}>
          <ContextMenuTrigger asChild>
            {children(
              <ActionRowActions
                className="end-[var(--app-sidebar-trailing-inset)] z-30"
                side="end"
              >
                <DropdownMenuTrigger asChild>
                  <ActionRowAction
                    aria-label={`${t("triggerAriaLabel")}: ${page.title}`}
                    className="flex h-full w-7 items-center justify-center rounded-md text-sidebar-foreground/45 outline-none transition-colors duration-100 ease-[cubic-bezier(0.2,0,0,1)] hover:text-sidebar-foreground focus-visible:text-sidebar-foreground focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sidebar-ring data-[state=open]:text-sidebar-foreground"
                    data-page-actions-trigger
                    type="button"
                  >
                    <HugeiconsIcon
                      aria-hidden
                      className="size-3.5"
                      icon={MoreHorizontalIcon}
                    />
                  </ActionRowAction>
                </DropdownMenuTrigger>
              </ActionRowActions>,
            )}
          </ContextMenuTrigger>
          <ContextMenuContent
            className="w-52"
            onCloseAutoFocus={handleCloseAutoFocus}
            onInteractOutside={handleInteractOutside}
          >
            {actions.map((action) => (
              <ContextMenuItem
                disabled={action.disabled}
                key={action.id}
                onSelect={action.onSelect}
                variant={action.variant}
              >
                <HugeiconsIcon icon={action.icon} className="size-4" />
                {action.label}
              </ContextMenuItem>
            ))}
          </ContextMenuContent>
        </ContextMenu>
        <DropdownMenuContent
          align="start"
          collisionPadding={8}
          className="w-52"
          onCloseAutoFocus={handleCloseAutoFocus}
          onInteractOutside={handleInteractOutside}
          side="right"
          sideOffset={6}
        >
          {actions.map((action) => (
            <DropdownMenuItem
              disabled={action.disabled}
              key={action.id}
              onSelect={action.onSelect}
              variant={action.variant}
            >
              <HugeiconsIcon icon={action.icon} className="size-4" />
              {action.label}
            </DropdownMenuItem>
          ))}
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
