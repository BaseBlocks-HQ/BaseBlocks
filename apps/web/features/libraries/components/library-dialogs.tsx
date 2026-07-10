"use client";

import type { LibraryDialogTarget } from "@/features/libraries/tree-input";
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
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export function DeleteItemDialog({
  onConfirm,
  onOpenChange,
  target,
}: {
  onConfirm: (target: LibraryDialogTarget) => Promise<void>;
  onOpenChange: (open: boolean) => void;
  target: LibraryDialogTarget | null;
}) {
  const t = useTranslations("libraries.explorer");
  const tCommon = useTranslations("common");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (target) setIsDeleting(false);
  }, [target]);

  const handleConfirm = () => {
    if (!target) return;
    setIsDeleting(true);
    void onConfirm(target)
      .then(() => onOpenChange(false))
      .catch((err: unknown) => {
        toast.error(err instanceof Error ? err.message : tCommon("error"));
      })
      .finally(() => setIsDeleting(false));
  };

  const title =
    target?.kind === "file" ? t("deleteFileTitle") : t("deleteFolderTitle");

  return (
    <AlertDialog
      open={Boolean(target)}
      onOpenChange={(open) => !open && onOpenChange(false)}
    >
      <AlertDialogContent className="overflow-hidden rounded-[1.5rem] border-sidebar-border bg-sidebar p-0 text-sidebar-foreground shadow-2xl sm:max-w-[32rem]">
        <AlertDialogHeader className="px-5 pt-5 pb-0 text-left sm:text-left">
          <AlertDialogTitle className="text-base font-semibold text-balance">
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm text-sidebar-foreground/60">
            {t("deleteItemDescription", { name: target?.name ?? "" })}
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
            disabled={isDeleting}
            className="rounded-full px-4 text-sm"
            onClick={handleConfirm}
          >
            {isDeleting ? tCommon("loading") : tCommon("delete")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
