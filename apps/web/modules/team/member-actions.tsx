"use client";

import {
  DashboardConfirmDialog,
  DashboardFormDialog,
} from "@/modules/shared/dialogs";
import { authClient } from "@/lib/auth/client";
import { api } from "@baseblocks/backend";
import type { Id } from "@baseblocks/backend";
import type { TeamRole } from "@baseblocks/types";
import { Button } from "@baseblocks/ui/button";
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
import { useMutation } from "convex/react";
import { MoreHorizontal, Shield, UserMinus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

interface Member {
  _id: Id<"members">;
  userId?: string;
  email: string;
  name?: string;
  role: TeamRole;
}

interface MemberActionsProps {
  member: Member;
  teamId: Id<"teams">;
  isCurrentUserAdmin: boolean;
}

const teamSelectTriggerClassName =
  "h-10 w-full rounded-[0.95rem] border-sidebar-border/80 bg-background/70 text-sidebar-foreground shadow-[inset_0_1px_0_hsl(var(--background)/0.35)]";

export function MemberActions({
  member,
  teamId,
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
    newRole: TeamRole;
    error: string | null;
  }>({
    showRemoveDialog: false,
    showRoleDialog: false,
    isRemoving: false,
    isChangingRole: false,
    newRole: member.role,
    error: null,
  });

  const removeMember = useMutation(api.members.mutations.removeMember);
  const updateRoleMutation = useMutation(api.members.mutations.updateRole);

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

    void removeMember({
      teamId,
      memberId: member._id,
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
      await updateRoleMutation({
        memberId: member._id,
        role: uiState.newRole,
      });
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

      <DashboardFormDialog
        open={uiState.showRoleDialog}
        onOpenChange={handleRoleDialogOpenChange}
        title={t("actions.changeRole")}
        description={t("actions.changeRoleDescription", {
          name: memberLabel,
        })}
        onSubmit={handleRoleSubmit}
        isSubmitting={uiState.isChangingRole}
        submitDisabled={uiState.newRole === member.role}
        submitLabel={tCommon("save")}
        submittingLabel={tCommon("loading")}
        cancelLabel={tCommon("cancel")}
        bodyClassName="px-5 pb-4"
        formClassName="space-y-4"
        footerClassName="pt-2"
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
                newRole: value as TeamRole,
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
          <p
            className={cn(
              "rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive",
            )}
          >
            {uiState.error}
          </p>
        ) : null}
      </DashboardFormDialog>

      <DashboardConfirmDialog
        open={uiState.showRemoveDialog}
        onOpenChange={handleRemoveDialogOpenChange}
        title={t("actions.removeMember")}
        description={t("actions.confirmRemove", { name: memberLabel })}
        cancelLabel={tCommon("cancel")}
        confirmLabel={
          uiState.isRemoving ? t("actions.removing") : t("actions.removeMember")
        }
        confirmDisabled={uiState.isRemoving}
        variant="destructive"
        onConfirm={handleRemove}
      />
    </>
  );
}
