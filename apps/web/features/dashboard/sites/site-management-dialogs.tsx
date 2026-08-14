"use client";

import { api, type Id } from "@baseblocks/backend";
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
import { Spinner } from "@baseblocks/ui/spinner";
import { useMutation } from "convex/react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

export type SiteManagementTarget = {
  _id: string;
  name: string;
  logoFileId?: string;
};

export function SiteManagementDialogs({
  deleteOpen,
  onDeleteOpenChange,
  onDeleted,
  site,
}: {
  deleteOpen: boolean;
  onDeleteOpenChange: (open: boolean) => void;
  onDeleted?: () => void;
  site: SiteManagementTarget;
}) {
  const t = useTranslations();
  const removeSite = useMutation(api.sites.remove);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);

    try {
      await removeSite({ siteId: site._id as Id<"sites"> });
      onDeleteOpenChange(false);
      onDeleted?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("common.error"));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={deleteOpen} onOpenChange={onDeleteOpenChange}>
      <AlertDialogContent className="overflow-hidden rounded-[1.5rem] border-sidebar-border bg-sidebar p-0 text-sidebar-foreground shadow-2xl sm:max-w-[32rem]">
        <AlertDialogHeader className="px-5 pt-5 pb-0 text-left sm:text-left">
          <AlertDialogTitle className="text-base font-semibold text-balance">
            {t("sites.delete")}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm text-sidebar-foreground/60">
            {t("sites.confirmDelete")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="px-5 pt-3 pb-4 sm:justify-end">
          <AlertDialogCancel
            className="rounded-full border-sidebar-border/70 bg-transparent px-3.5 text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            disabled={isDeleting}
            size="sm"
          >
            {t("common.cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            className="rounded-full px-4 text-sm"
            disabled={isDeleting}
            onClick={handleDelete}
            size="sm"
            variant="destructive"
          >
            {isDeleting ? (
              <>
                <Spinner />
                {t("dialogs.delete.deleting")}
              </>
            ) : (
              t("sites.delete")
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
