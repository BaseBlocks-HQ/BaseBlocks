"use client";

import { authClient } from "@/app/_auth/client";
import type { WorkspaceUser } from "@/modules/workspace/server";
import { api } from "@baseblocks/backend";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@baseblocks/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@baseblocks/ui/avatar";
import { Button } from "@baseblocks/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@baseblocks/ui/dialog";
import { cn } from "@baseblocks/ui/lib/utils";
import { useMutation } from "convex/react";
import { Loader2, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { IconGear } from "nucleo-glass";
import { type ReactNode, useState } from "react";
import { toast } from "sonner";

export function AccountSettings({
  asChild = false,
  children,
  open: openProp,
  onOpenChange,
  showTrigger = true,
  triggerClassName,
  user,
}: {
  asChild?: boolean;
  children?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  showTrigger?: boolean;
  triggerClassName?: string;
  user?: WorkspaceUser | null;
} = {}) {
  const t = useTranslations("settings");
  const tCommon = useTranslations("common");

  const [internalOpen, setInternalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const open = openProp ?? internalOpen;
  const setOpen = (nextOpen: boolean) => {
    if (!nextOpen) {
      setDeleteConfirmOpen(false);
      setDeleteError(null);
    }
    if (openProp === undefined) {
      setInternalOpen(nextOpen);
    }
    onOpenChange?.(nextOpen);
  };

  const deleteMyAccountData = useMutation(
    api.teams.deleteMyAccountData,
  );

  const getInitials = (name?: string, email?: string) => {
    if (name) return name.slice(0, 2).toUpperCase();
    if (email) return email[0]?.toUpperCase() || "?";
    return "?";
  };

  const handleDeleteDialogOpenChange = (next: boolean) => {
    if (!next) {
      if (isDeleting) return;
      setDeleteConfirmOpen(false);
      setDeleteError(null);
      return;
    }
    setDeleteConfirmOpen(true);
  };

  const openDeleteConfirm = () => {
    setDeleteError(null);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteMyAccountData();
      await authClient.signOut();
      setDeleteConfirmOpen(false);
      setOpen(false);
      window.location.href = "/login";
      setIsDeleting(false);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : t("deleteAccountError");
      setDeleteError(message);
      toast.error(message);
      setIsDeleting(false);
    }
  };

  const trigger =
    showTrigger &&
    (asChild && children ? (
      children
    ) : (
      <Button
        type="button"
        variant="ghost"
        className={cn("h-8 w-full justify-start gap-2 px-2", triggerClassName)}
      >
        <IconGear className="h-4 w-4" />
        <span>{tCommon("settings")}</span>
      </Button>
    ));

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
        <DialogContent
          className={`overflow-hidden rounded-[1.5rem] border-sidebar-border bg-sidebar p-0 text-sidebar-foreground shadow-2xl sm:max-w-[46rem] [&_[data-slot='dialog-close']]:top-4 [&_[data-slot='dialog-close']]:right-4 sm:max-w-sm`}
        >
          <DialogHeader className={`px-5 pt-4 pb-0 pb-1`}>
            <DialogTitle className="text-sm font-medium tracking-tight text-sidebar-foreground">
              {t("title")}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-0 px-5 pb-4 pt-0">
            <div className="flex gap-3.5">
              <Avatar className="h-11 w-11 shrink-0 ring-1 ring-sidebar-border/50 ring-offset-2 ring-offset-sidebar">
                {user?.imageUrl && <AvatarImage alt="" src={user.imageUrl} />}
                <AvatarFallback className="text-xs font-medium">
                  {getInitials(
                    user?.name ?? undefined,
                    user?.email ?? undefined,
                  )}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1 space-y-0.5 pt-0.5">
                <p className="text-balance text-[0.9375rem] font-medium leading-snug tracking-tight text-sidebar-foreground">
                  {user?.name || t("anonymous")}
                </p>
                {user?.email ? (
                  <p className="truncate text-pretty text-xs leading-relaxed text-sidebar-foreground/50">
                    {user.email}
                  </p>
                ) : null}
              </div>
            </div>

            <Button
              type="button"
              variant="destructive"
              onClick={openDeleteConfirm}
              className="mt-8 h-9 w-full shrink-0 rounded-full px-4 text-sm"
            >
              <Trash2 className="mr-2 h-4 w-4 shrink-0" aria-hidden />
              {t("deleteAccount")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleteConfirmOpen}
        onOpenChange={handleDeleteDialogOpenChange}
      >
        <AlertDialogContent className="overflow-hidden gap-0 rounded-[1.25rem] border-sidebar-border bg-sidebar p-0 text-sidebar-foreground shadow-2xl sm:max-w-[min(100vw-2rem,20rem)]">
          <AlertDialogHeader className="space-y-2 px-5 pt-5 pb-1 text-left">
            <AlertDialogTitle className="text-balance text-[0.9375rem] font-medium leading-snug tracking-tight text-sidebar-foreground">
              {t("deleteConfirmTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription
              asChild
              className="text-xs leading-relaxed text-sidebar-foreground/50"
            >
              <p className="text-pretty">{t("deleteConfirmDescription")}</p>
            </AlertDialogDescription>
            {deleteError ? (
              <p
                role="alert"
                className="text-pretty pt-1 text-xs leading-relaxed text-destructive"
              >
                {deleteError}
              </p>
            ) : null}
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-row gap-2 px-5 pb-4 pt-3">
            <AlertDialogCancel
              size="sm"
              disabled={isDeleting}
              className="mt-0 h-9 flex-1 rounded-[0.65rem] border-sidebar-border/60 bg-transparent text-xs font-normal text-sidebar-foreground hover:bg-sidebar-accent/40"
            >
              {tCommon("cancel")}
            </AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={isDeleting}
              className="h-9 flex-1 rounded-[0.65rem] text-xs font-medium transition-transform active:scale-[0.98]"
              onClick={() => {
                void handleDeleteAccount();
              }}
            >
              {isDeleting ? (
                <span className="inline-flex items-center gap-1.5">
                  <Loader2
                    className="size-3.5 shrink-0 animate-spin"
                    aria-hidden
                  />
                  {t("deleting")}
                </span>
              ) : (
                t("deleteConfirmAction")
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
