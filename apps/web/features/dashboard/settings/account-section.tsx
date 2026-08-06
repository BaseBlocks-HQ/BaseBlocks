"use client";

import type { WorkspaceUser } from "@/features/authentication/model";
import { authClient } from "@/lib/auth/client";
import { Delete01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
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
import { Spinner } from "@baseblocks/ui/spinner";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

export function AccountSection({
  ownedOrganizationCount,
  user,
}: {
  ownedOrganizationCount: number;
  user: WorkspaceUser | null;
}) {
  const t = useTranslations("settings");
  const tCommon = useTranslations("common");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const initials = user?.name
    ? user.name.slice(0, 2).toUpperCase()
    : (user?.email?.[0]?.toUpperCase() ?? "?");

  const deleteAccount = async () => {
    setDeleting(true);
    try {
      const result = await authClient.deleteUser();
      if (result.error) throw result.error;
      await authClient.signOut();
      window.location.href = "/login";
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t("deleteAccountError"),
      );
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-lg font-semibold tracking-tight">
          {t("accountTitle")}
        </h2>
        <div className="mt-5 flex items-center gap-4">
          <Avatar className="size-12 ring-1 ring-border">
            {user?.imageUrl ? <AvatarImage alt="" src={user.imageUrl} /> : null}
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate font-medium">
              {user?.name || t("anonymous")}
            </p>
            {user?.email ? (
              <p className="truncate text-sm text-muted-foreground">
                {user.email}
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <section className="rounded-xl bg-destructive/5 p-4 ring-1 ring-destructive/15">
        <h3 className="text-sm font-medium text-destructive">
          {t("dangerZone")}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {ownedOrganizationCount > 0
            ? t("deleteAccountOwnerBlocked", {
                count: ownedOrganizationCount,
              })
            : t("deleteAccountDescription")}
        </p>
        <Button
          className="mt-4"
          disabled={ownedOrganizationCount > 0}
          onClick={() => setConfirmOpen(true)}
          size="sm"
          type="button"
          variant="destructive"
        >
          <HugeiconsIcon icon={Delete01Icon} className="size-4" />
          {t("deleteAccount")}
        </Button>
      </section>

      <AlertDialog
        open={confirmOpen}
        onOpenChange={(open) => {
          if (!open && !deleting) setConfirmOpen(false);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteConfirmDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>
              {tCommon("cancel")}
            </AlertDialogCancel>
            <Button
              disabled={deleting}
              onClick={() => void deleteAccount()}
              variant="destructive"
            >
              {deleting ? <Spinner className="size-4" /> : null}
              {deleting ? t("deleting") : t("deleteConfirmAction")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
