"use client";

import { DashboardDialogShell } from "@/components/dialogs";
import { authClient } from "@/lib/auth/client";
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
import { cn } from "@baseblocks/ui/lib/utils";
import { Separator } from "@baseblocks/ui/separator";
import { useMutation } from "convex/react";
import { Loader2, Mail, Settings, Trash2 } from "lucide-react";
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
}: {
  asChild?: boolean;
  children?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  showTrigger?: boolean;
  triggerClassName?: string;
} = {}) {
  const t = useTranslations("settings");
  const tCommon = useTranslations("common");
  const { data: session } = authClient.useSession();
  const user = session?.user;

  const [internalOpen, setInternalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const open = openProp ?? internalOpen;
  const setOpen = (nextOpen: boolean) => {
    if (!nextOpen) {
      setDeleteConfirmOpen(false);
      setError(null);
    }
    if (openProp === undefined) {
      setInternalOpen(nextOpen);
    }
    onOpenChange?.(nextOpen);
  };

  const deleteMyAccountData = useMutation(
    api.members.mutations.deleteMyAccountData,
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
      setError(null);
      return;
    }
    setDeleteConfirmOpen(true);
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    setError(null);
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
      setError(message);
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
        className={cn(
          "h-8 w-full justify-start gap-2 px-2",
          triggerClassName,
        )}
      >
        <IconGear className="h-4 w-4" />
        <span>{tCommon("settings")}</span>
      </Button>
    ));

  return (
    <>
      <DashboardDialogShell
        open={open}
        onOpenChange={setOpen}
        title={
          <span className="flex items-center gap-2">
            <Settings className="h-5 w-5 shrink-0" />
            {t("title")}
          </span>
        }
        description={t("description")}
        contentClassName="sm:max-w-md"
        bodyClassName="px-5 pb-4 pt-1"
        trigger={trigger || undefined}
      >
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              {user?.image && <AvatarImage src={user.image} />}
              <AvatarFallback className="text-lg">
                {getInitials(user?.name, user?.email)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-lg font-semibold text-sidebar-foreground">
                {user?.name || t("anonymous")}
              </p>
              {user?.email && (
                <div className="flex items-center gap-2 text-sm text-sidebar-foreground/60">
                  <Mail className="h-4 w-4 shrink-0" />
                  <span className="truncate">{user.email}</span>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3 rounded-[0.95rem] border border-sidebar-border/70 bg-sidebar-accent/20 p-4">
            <h3 className="text-sm font-medium text-sidebar-foreground">
              {t("accountInfo")}
            </h3>
            <div className="space-y-2 text-sm">
              {user?.email && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sidebar-foreground/60">{t("email")}</span>
                  <span className="max-w-[200px] truncate font-medium text-sidebar-foreground">
                    {user.email}
                  </span>
                </div>
              )}
              {user?.id && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sidebar-foreground/60">{t("userId")}</span>
                  <span className="max-w-[200px] truncate font-mono text-xs text-sidebar-foreground">
                    {user.id}
                  </span>
                </div>
              )}
            </div>
          </div>

          <Separator className="bg-sidebar-border/60" />

          <div className="space-y-3">
            <h3 className="text-sm font-medium text-destructive">
              {t("dangerZone")}
            </h3>
            <p className="text-pretty text-sm text-sidebar-foreground/60">
              {t("deleteAccountWarning")}
            </p>

            {error && (
              <p
                className={cn(
                  "rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive",
                )}
              >
                {error}
              </p>
            )}

            <Button
              type="button"
              variant="destructive"
              className="h-9 w-full rounded-full"
              onClick={() => {
                setError(null);
                setDeleteConfirmOpen(true);
              }}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {t("deleteAccount")}
            </Button>
          </div>
        </div>
      </DashboardDialogShell>

      <AlertDialog
        open={deleteConfirmOpen}
        onOpenChange={handleDeleteDialogOpenChange}
      >
        <AlertDialogContent className="overflow-hidden rounded-[1.5rem] border-sidebar-border bg-sidebar p-0 text-sidebar-foreground shadow-2xl sm:max-w-[32rem]">
          <AlertDialogHeader className="px-5 pt-5 pb-0 text-left sm:text-left">
            <AlertDialogTitle className="text-base font-semibold text-balance">
              {t("deleteConfirmTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription
              asChild
              className="text-sm text-sidebar-foreground/60"
            >
              <div className="text-pretty">{t("deleteConfirmDescription")}</div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="px-5 pt-3 pb-4 sm:justify-end">
            <AlertDialogCancel
              size="sm"
              disabled={isDeleting}
              className="rounded-full border-sidebar-border/70 bg-transparent px-3.5 text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            >
              {tCommon("cancel")}
            </AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={isDeleting}
              className="rounded-full px-4 text-sm"
              onClick={() => {
                void handleDeleteAccount();
              }}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("deleting")}
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  {t("deleteAccount")}
                </>
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
