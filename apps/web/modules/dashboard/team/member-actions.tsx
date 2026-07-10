"use client";

import { authClient } from "@/app/_auth/client";
import type { OrganizationRole } from "@baseblocks/backend/auth-permissions";
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
import { cn } from "@baseblocks/ui/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@baseblocks/ui/select";
import { MoreHorizontal, Shield, UserMinus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

interface Member {
  _id: string;
  userId?: string;
  email: string;
  name?: string;
  role: OrganizationRole;
}

interface MemberActionsProps {
  member: Member;
  organizationId: string;
  isCurrentUserAdmin: boolean;
}

const teamSelectTriggerClassName =
  "h-10 w-full rounded-[0.95rem] border-sidebar-border/80 bg-background/70 text-sidebar-foreground shadow-[inset_0_1px_0_hsl(var(--background)/0.35)]";

export function MemberActions({
  member,
  organizationId,
  isCurrentUserAdmin,
}: MemberActionsProps) {
  const t = useTranslations("team");
  const tCommon = useTranslations("common");
  const { data: session } = authClient.useSession();

  const [uiState, setUiState] = useState<{
    showRemoveDialog: boolean;
    showRoleDialog: boolean;
    isRemoving: boolean;
    isChangingRole: boolean;
    newRole: OrganizationRole;
    error: string | null;
  }>({
    showRemoveDialog: false,
    showRoleDialog: false,
    isRemoving: false,
    isChangingRole: false,
    newRole: member.role,
    error: null,
  });

  const isCurrentUser = session?.user?.id === member.userId;
  const canModify = isCurrentUserAdmin && !isCurrentUser;

  const memberLabel = member.name || member.email;

  const handleRemoveDialogOpenChange = (open: boolean) => {
    if (!open) {
      setUiState((current) => ({
        ...current,
        showRemoveDialog: false,
        isRemoving: false,
      }));
      return;
    }
    setUiState((current) => ({
      ...current,
      showRemoveDialog: true,
    }));
  };

  const handleRemove = () => {
    setUiState((current) => ({
      ...current,
      isRemoving: true,
    }));

    void authClient.organization
      .removeMember({
        organizationId,
        memberIdOrEmail: member._id,
      })
      .then(() => {
        setUiState((current) => ({
          ...current,
          showRemoveDialog: false,
          isRemoving: false,
        }));
      })
      .catch((err: unknown) => {
        toast.error(err instanceof Error ? err.message : tCommon("error"));
        setUiState((current) => ({
          ...current,
          isRemoving: false,
        }));
      });
  };

  const handleRoleDialogOpenChange = (open: boolean) => {
    if (!open) {
      setUiState((current) => ({
        ...current,
        showRoleDialog: false,
        newRole: member.role,
        error: null,
        isChangingRole: false,
      }));
      return;
    }
    setUiState((current) => ({
      ...current,
      showRoleDialog: true,
      newRole: member.role,
      error: null,
    }));
  };

  const handleRoleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (uiState.newRole === member.role) {
      setUiState((current) => ({
        ...current,
        showRoleDialog: false,
      }));
      return;
    }

    setUiState((current) => ({
      ...current,
      isChangingRole: true,
      error: null,
    }));

    try {
      const result = await authClient.organization.updateMemberRole({
        organizationId,
        memberId: member._id,
        role: uiState.newRole,
      });
      if (result.error) throw result.error;
      setUiState((current) => ({
        ...current,
        showRoleDialog: false,
        isChangingRole: false,
      }));
    } catch (err) {
      setUiState((current) => ({
        ...current,
        error: err instanceof Error ? err.message : tCommon("error"),
        isChangingRole: false,
      }));
    }
  };

  if (!canModify) {
    return null;
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">{t("member.actions")}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={() =>
              setUiState((current) => ({
                ...current,
                showRoleDialog: true,
                newRole: member.role,
                error: null,
              }))
            }
          >
            <Shield className="mr-2 h-4 w-4" />
            {t("actions.changeRole")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive"
            onClick={() =>
              setUiState((current) => ({
                ...current,
                showRemoveDialog: true,
              }))
            }
          >
            <UserMinus className="mr-2 h-4 w-4" />
            {t("actions.removeMember")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog
        open={uiState.showRoleDialog}
        onOpenChange={handleRoleDialogOpenChange}
      >
        <DialogContent
          className={
            "overflow-hidden rounded-[1.5rem] border-sidebar-border bg-sidebar p-0 text-sidebar-foreground shadow-2xl sm:max-w-[46rem] [&_[data-slot='dialog-close']]:top-4 [&_[data-slot='dialog-close']]:right-4"
          }
        >
          <DialogHeader className={"px-5 pt-4 pb-0"}>
            <DialogTitle className={"text-base font-semibold"}>
              {t("actions.changeRole")}
            </DialogTitle>
            <DialogDescription className={"text-sm text-sidebar-foreground/60"}>
              {t("actions.changeRoleDescription", {
                name: memberLabel,
              })}
            </DialogDescription>
          </DialogHeader>
          <form
            noValidate
            onSubmit={handleRoleSubmit}
            className={cn("px-5 pb-3", "space-y-4 pb-4")}
          >
            <div className="rounded-[1.1rem] border border-sidebar-border/80 bg-background/55 p-3 shadow-[inset_0_1px_0_hsl(var(--background)/0.4)]">
              <Label className="mb-2 block text-xs font-medium tracking-wide text-sidebar-foreground/55">
                {t("member.role")}
              </Label>
              <Select
                value={uiState.newRole}
                onValueChange={(value) =>
                  setUiState((current) => ({
                    ...current,
                    newRole: value as OrganizationRole,
                    error: null,
                  }))
                }
              >
                <SelectTrigger className={teamSelectTriggerClassName}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-[1rem] border-sidebar-border bg-sidebar text-sidebar-foreground shadow-2xl">
                  <SelectItem
                    value="admin"
                    className="rounded-[0.7rem] py-2 focus:bg-sidebar-accent focus:text-sidebar-accent-foreground"
                  >
                    {t("roles.admin")}
                  </SelectItem>
                  <SelectItem
                    value="editor"
                    className="rounded-[0.7rem] py-2 focus:bg-sidebar-accent focus:text-sidebar-accent-foreground"
                  >
                    {t("roles.editor")}
                  </SelectItem>
                  <SelectItem
                    value="viewer"
                    className="rounded-[0.7rem] py-2 focus:bg-sidebar-accent focus:text-sidebar-accent-foreground"
                  >
                    {t("roles.viewer")}
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="mt-2.5 text-pretty text-sm leading-relaxed text-sidebar-foreground/60">
                {uiState.newRole === "admin"
                  ? t("roleDescriptions.admin")
                  : uiState.newRole === "editor"
                    ? t("roleDescriptions.editor")
                    : t("roleDescriptions.viewer")}
              </p>
            </div>

            {uiState.error ? (
              <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {uiState.error}
              </p>
            ) : null}
            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleRoleDialogOpenChange(false)}
                disabled={uiState.isChangingRole}
                className={
                  "h-8 rounded-full border-sidebar-border/70 bg-transparent px-3.5 text-sm"
                }
              >
                {tCommon("cancel")}
              </Button>
              <Button
                type="submit"
                disabled={
                  uiState.isChangingRole || uiState.newRole === member.role
                }
                className={"h-8 rounded-full px-4 text-sm"}
              >
                {uiState.isChangingRole ? tCommon("loading") : tCommon("save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={uiState.showRemoveDialog}
        onOpenChange={handleRemoveDialogOpenChange}
      >
        <AlertDialogContent className="overflow-hidden rounded-[1.5rem] border-sidebar-border bg-sidebar p-0 text-sidebar-foreground shadow-2xl sm:max-w-[32rem]">
          <AlertDialogHeader className="px-5 pt-5 pb-0 text-left sm:text-left">
            <AlertDialogTitle className="text-base font-semibold text-balance">
              {t("actions.removeMember")}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-sidebar-foreground/60">
              {t("actions.confirmRemove", { name: memberLabel })}
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
              disabled={uiState.isRemoving}
              className="rounded-full px-4 text-sm"
              onClick={handleRemove}
            >
              {uiState.isRemoving
                ? t("actions.removing")
                : t("actions.removeMember")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
