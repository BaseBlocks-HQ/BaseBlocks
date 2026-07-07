"use client";

import {
  DashboardConfirmDialog,
  DashboardFormDialog,
  dashboardDialogPrimaryFieldLabelClassName,
} from "@/modules/shared/dialogs";
import { usePages } from "@/lib/data";
import {
  useEditorSite,
  useEditorUi,
} from "@/modules/shared/contexts/editor-context";
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
import { Label } from "@baseblocks/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@baseblocks/ui/select";
import { useMutation } from "convex/react";
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
import { CreateChildPageDialog } from "./create-child-page-dialog";
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
  const t = useTranslations("navigation.pageActions");
  const tDelete = useTranslations("navigation.deletePage");
  const tCommon = useTranslations("common");
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [childPageOpen, setChildPageOpen] = useState(false);
  const [accessOpen, setAccessOpen] = useState(false);
  const [exposureDialogOpen, setExposureDialogOpen] = useState(false);
  const [pendingExposure, setPendingExposure] = useState<
    "block" | "both" | null
  >(null);
  const [targetPageId, setTargetPageId] = useState("");

  const { isAdmin } = useEditorSite();
  const { currentPageId, selection } = useEditorUi();
  const pages = usePages(siteId);

  const setDefaultPage = useMutation(api.sites.mutations.setDefaultPage);
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
          <DropdownMenuItem onClick={() => setChildPageOpen(true)}>
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
          <DropdownMenuItem onClick={() => setRenameOpen(true)}>
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

      <CreateChildPageDialog
        siteId={siteId}
        parentId={page._id}
        parentTitle={page.title}
        open={childPageOpen}
        onOpenChange={setChildPageOpen}
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

      <DashboardConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={tDelete("title")}
        description={
          <>
            {tDelete("description", { title: page.title })}
            {isDefault ? (
              <span className="mt-2 block text-amber-600 dark:text-amber-400">
                {tDelete("defaultWarning")}
              </span>
            ) : null}
          </>
        }
        confirmLabel={tDelete("confirm")}
        cancelLabel={tCommon("cancel")}
        variant="destructive"
        onConfirm={handleDelete}
      />

      <DashboardFormDialog
        open={exposureDialogOpen}
        onOpenChange={handleExposureDialogOpenChange}
        title={t("chooseBlockPageTitle")}
        description={t("chooseBlockPageDescription")}
        onSubmit={handleConfirmExposureTarget}
        isSubmitting={false}
        submitDisabled={!targetPageId}
        submitLabel={t("insertBlock")}
        submittingLabel={t("inserting")}
        cancelLabel={tCommon("cancel")}
        bodyClassName="px-5 pb-3"
        formClassName="space-y-2"
      >
        <div className="space-y-2">
          <Label
            htmlFor="pageExposureTarget"
            className={dashboardDialogPrimaryFieldLabelClassName}
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
      </DashboardFormDialog>
    </>
  );
}
