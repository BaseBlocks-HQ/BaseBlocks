"use client";

import { useRouter } from "@/i18n/navigation";
import { authClient } from "@/lib/auth-client";
import { api } from "@baseblocks/backend";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@baseblocks/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@baseblocks/ui/avatar";
import { Button } from "@baseblocks/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@baseblocks/ui/dialog";
import { Separator } from "@baseblocks/ui/separator";
import { useMutation } from "convex/react";
import { Loader2, Mail, Settings, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

export function AccountSettings() {
  const t = useTranslations("settings");
  const tCommon = useTranslations("common");
  const { data: session } = authClient.useSession();
  const user = session?.user;
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deleteMyAccountData = useMutation(
    api.members.mutations.deleteMyAccountData,
  );

  const getInitials = (name?: string, email?: string) => {
    if (name) return name.slice(0, 2).toUpperCase();
    if (email) return email[0]?.toUpperCase() || "?";
    return "?";
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    setError(null);
    try {
      // First, delete user data from Convex database
      await deleteMyAccountData();

      // Sign out after deleting data
      await authClient.signOut();
      setOpen(false);
      router.push("/login");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : t("deleteAccountError");
      setError(message);
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" className="w-full justify-start gap-2 h-8 px-2">
          <Settings className="h-4 w-4" />
          <span>{tCommon("settings")}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            {t("title")}
          </DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* User Profile Section */}
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              {user?.image && <AvatarImage src={user.image} />}
              <AvatarFallback className="text-lg">
                {getInitials(user?.name, user?.email)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-lg truncate">
                {user?.name || t("anonymous")}
              </p>
              {user?.email && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <span className="truncate">{user.email}</span>
                </div>
              )}
            </div>
          </div>

          {/* Account Info */}
          <div className="rounded-lg border bg-card p-4 space-y-3">
            <h3 className="font-medium text-sm">{t("accountInfo")}</h3>
            <div className="space-y-2 text-sm">
              {user?.email && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t("email")}</span>
                  <span className="font-medium truncate max-w-[200px]">
                    {user.email}
                  </span>
                </div>
              )}
              {user?.id && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t("userId")}</span>
                  <span className="font-mono text-xs truncate max-w-[200px]">
                    {user.id}
                  </span>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Danger Zone */}
          <div className="space-y-3">
            <h3 className="font-medium text-sm text-destructive">
              {t("dangerZone")}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t("deleteAccountWarning")}
            </p>

            {error && (
              <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded">
                {error}
              </p>
            )}

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full">
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t("deleteAccount")}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t("deleteConfirmTitle")}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t("deleteConfirmDescription")}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{tCommon("cancel")}</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteAccount}
                    disabled={isDeleting}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {isDeleting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {t("deleting")}
                      </>
                    ) : (
                      <>
                        <Trash2 className="h-4 w-4 mr-2" />
                        {t("deleteAccount")}
                      </>
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
