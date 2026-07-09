"use client";

import { generateSlug } from "@baseblocks/domain";
import { useEditorSite, useEditorUi } from "@/modules/editor/editor-state";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@baseblocks/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@baseblocks/ui/dropdown-menu";
import { Label } from "@baseblocks/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@baseblocks/ui/select";
import { useMutation, useQuery } from "convex/react";
import {
  Check,
  FilePlus,
  Lock,
  MoreHorizontal,
  Pencil,
  Star,
  Trash2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PageAccessDialog } from "./page-access";

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
  const t = useTranslations("navigation.pageActions");
  const tDelete = useTranslations("navigation.deletePage");
  const tCommon = useTranslations("common");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [accessOpen, setAccessOpen] = useState(false);
  const [exposureDialogOpen, setExposureDialogOpen] = useState(false);
  const [pendingExposure, setPendingExposure] = useState<
    "block" | "both" | null
  >(null);
  const [targetPageId, setTargetPageId] = useState("");

  const { isAdmin } = useEditorSite();
  const { currentPageId, selection } = useEditorUi();
  const pages = useQuery(api.pages.queries.list, {
    siteId: siteId as Id<"sites">,
  });

  const setDefaultPage = useMutation(api.sites.mutations.setDefaultPage);
  const createPage = useMutation(api.pages.mutations.create);
  const updatePage = useMutation(api.pages.mutations.update);
  const removePage = useMutation(api.pages.mutations.remove);
  const setExposure = useMutation(api.pages.mutations.setExposure);

  const exposure =
    page.showInNavigation !== false
      ? page.hasPageBlockReference
        ? "both"
        : "navigation"
      : "block";

  const targetOptions = useMemo(
    () =>
      (pages ?? [])
        .filter((candidate) => candidate._id !== page._id)
        .sort((a, b) => a.title.localeCompare(b.title)),
    [page._id, pages],
  );

  const handleSetExposure = async (
    nextExposure: "navigation" | "block" | "both",
  ) => {
    const inferredTargetPageId =
      currentPageId && currentPageId !== page._id ? currentPageId : null;

    if (
      (nextExposure === "block" || nextExposure === "both") &&
      !inferredTargetPageId
    ) {
      setPendingExposure(nextExposure);
      setTargetPageId("");
      setExposureDialogOpen(true);
      return;
    }

    await setExposure({
      pageId: page._id as Id<"pages">,
      exposure: nextExposure,
      targetPageId: inferredTargetPageId as Id<"pages"> | undefined,
      targetLayoutId:
        selection.layoutId && inferredTargetPageId
          ? (selection.layoutId as Id<"layouts">)
          : undefined,
      targetSlotId: selection.slotId ?? undefined,
    });
  };

  const handleSetDefault = async () => {
    await setDefaultPage({
      siteId: siteId as Id<"sites">,
      pageId: page._id as Id<"pages">,
    });
  };

  const handleAddChildPage = async () => {
    const title = window.prompt(t("addChildPage"));
    if (!title?.trim()) return;

    await createPage({
      siteId: siteId as Id<"sites">,
      parentId: page._id as Id<"pages">,
      title: title.trim(),
      slug: generateSlug(title),
    });
    onExpandParent?.();
  };

  const handleRename = async () => {
    const title = window.prompt(t("rename"), page.title);
    if (!title?.trim()) return;

    await updatePage({
      pageId: page._id as Id<"pages">,
      title: title.trim(),
      slug: generateSlug(title),
    });
  };

  const handleDelete = async () => {
    await removePage({ pageId: page._id as Id<"pages"> });
    setDeleteOpen(false);
  };

  const handleExposureDialogOpenChange = (open: boolean) => {
    if (!open) {
      setPendingExposure(null);
      setTargetPageId("");
    }
    setExposureDialogOpen(open);
  };

  const handleConfirmExposureTarget = async (
    e: React.FormEvent<HTMLFormElement>,
  ) => {
    e.preventDefault();

    if (!pendingExposure || !targetPageId) {
      toast.error(t("choosePageToast"));
      return;
    }

    await setExposure({
      pageId: page._id as Id<"pages">,
      exposure: pendingExposure,
      targetPageId: targetPageId as Id<"pages">,
    });

    handleExposureDialogOpenChange(false);
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
          <DropdownMenuItem onClick={handleAddChildPage}>
            <FilePlus className="h-4 w-4" />
            {t("addChildPage")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => handleSetExposure("navigation")}>
            <Check
              className={
                exposure === "navigation" ? "h-4 w-4" : "h-4 w-4 opacity-0"
              }
            />
            {t("navigationOnly")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleSetExposure("block")}>
            <Check
              className={exposure === "block" ? "h-4 w-4" : "h-4 w-4 opacity-0"}
            />
            {t("pageBlockOnly")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleSetExposure("both")}>
            <Check
              className={exposure === "both" ? "h-4 w-4" : "h-4 w-4 opacity-0"}
            />
            {t("navigationAndBlock")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleRename}>
            <Pencil className="h-4 w-4" />
            {t("rename")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setAccessOpen(true)}>
            <Lock className="h-4 w-4" />
            {t("access")}
          </DropdownMenuItem>
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

      <PageAccessDialog
        isAdmin={isAdmin}
        open={accessOpen}
        onOpenChange={setAccessOpen}
        page={page}
        siteId={siteId}
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

      <Dialog
        open={exposureDialogOpen}
        onOpenChange={handleExposureDialogOpenChange}
      >
        <DialogContent
          className={
            "overflow-hidden rounded-[1.5rem] border-sidebar-border bg-sidebar p-0 text-sidebar-foreground shadow-2xl sm:max-w-[46rem] [&_[data-slot='dialog-close']]:top-4 [&_[data-slot='dialog-close']]:right-4"
          }
        >
          <DialogHeader className={"px-5 pt-4 pb-0"}>
            <DialogTitle className={"text-base font-semibold"}>
              {t("chooseBlockPageTitle")}
            </DialogTitle>
            <DialogDescription className={"text-sm text-sidebar-foreground/60"}>
              {t("chooseBlockPageDescription")}
            </DialogDescription>
          </DialogHeader>
          <form
            noValidate
            onSubmit={handleConfirmExposureTarget}
            className={"px-5 pb-3"}
          >
            <div className="space-y-2">
              <Label
                htmlFor="pageExposureTarget"
                className={
                  "mb-0.5 block text-xs font-medium tracking-wide text-sidebar-foreground/55"
                }
              >
                {t("insertIntoPageLabel")}
              </Label>
              <Select value={targetPageId} onValueChange={setTargetPageId}>
                <SelectTrigger
                  id="pageExposureTarget"
                  className="rounded-[0.95rem] border-sidebar-border/80 bg-background/70"
                >
                  <SelectValue placeholder={t("choosePagePlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {targetOptions.map((candidate) => (
                    <SelectItem key={candidate._id} value={candidate._id}>
                      {candidate.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleExposureDialogOpenChange(false)}
                className={
                  "h-8 rounded-full border-sidebar-border/70 bg-transparent px-3.5 text-sm"
                }
              >
                {tCommon("cancel")}
              </Button>
              <Button
                type="submit"
                disabled={!targetPageId}
                className={"h-8 rounded-full px-4 text-sm"}
              >
                {t("insertBlock")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
