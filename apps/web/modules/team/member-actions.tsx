"use client";

import { authClient } from "@/lib/auth/client";
import { api } from "@baseblocks/backend";
import type { Id } from "@baseblocks/backend";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@baseblocks/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@baseblocks/ui/select";
import { useMutation } from "convex/react";
import { Loader2, MoreHorizontal, Shield, UserMinus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

interface Member {
  _id: Id<"members">;
  userId?: string;
  email: string;
  name?: string;
  role: "admin" | "viewer";
}

interface MemberActionsProps {
  member: Member;
  teamId: Id<"teams">;
  isCurrentUserAdmin: boolean;
}

export function MemberActions({
  member,
  teamId,
  isCurrentUserAdmin,
}: MemberActionsProps) {
  const t = useTranslations("team");
  const { data: session } = authClient.useSession();

  const [uiState, setUiState] = useState<{
    showRemoveDialog: boolean;
    showRoleDialog: boolean;
    isRemoving: boolean;
    isChangingRole: boolean;
    newRole: "admin" | "viewer";
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

  const handleRemove = async () => {
    setUiState((current) => ({
      ...current,
      isRemoving: true,
      error: null,
    }));

    try {
      await removeMember({
        teamId,
        memberId: member._id,
      });

      setUiState((current) => ({
        ...current,
        showRemoveDialog: false,
        isRemoving: false,
      }));
    } catch (err) {
      setUiState((current) => ({
        ...current,
        error: err instanceof Error ? err.message : "Failed to remove member",
        isRemoving: false,
      }));
    }
  };

  const handleRoleChange = async () => {
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
        error: err instanceof Error ? err.message : "Failed to change role",
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
            <span className="sr-only">Actions</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={() =>
              setUiState((current) => ({
                ...current,
                showRoleDialog: true,
              }))
            }
          >
            <Shield className="h-4 w-4 mr-2" />
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
            <UserMinus className="h-4 w-4 mr-2" />
            {t("actions.removeMember")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Change Role Dialog */}
      <AlertDialog
        open={uiState.showRoleDialog}
        onOpenChange={(showRoleDialog) =>
          setUiState((current) => ({
            ...current,
            showRoleDialog,
          }))
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("actions.changeRole")}</AlertDialogTitle>
            <AlertDialogDescription>
              Change the role for {member.name || member.email}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="py-4">
            <Select
              value={uiState.newRole}
              onValueChange={(value) =>
                setUiState((current) => ({
                  ...current,
                  newRole: value as "admin" | "viewer",
                }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">
                  <div className="flex flex-col items-start">
                    <span>{t("roles.admin")}</span>
                    <span className="text-xs text-muted-foreground">
                      {t("roleDescriptions.admin")}
                    </span>
                  </div>
                </SelectItem>
                <SelectItem value="viewer">
                  <div className="flex flex-col items-start">
                    <span>{t("roles.viewer")}</span>
                    <span className="text-xs text-muted-foreground">
                      {t("roleDescriptions.viewer")}
                    </span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>

            {uiState.error && (
              <p className="text-sm text-destructive mt-2">{uiState.error}</p>
            )}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRoleChange}
              disabled={
                uiState.isChangingRole || uiState.newRole === member.role
              }
            >
              {uiState.isChangingRole && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Save
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Remove Member Dialog */}
      <AlertDialog
        open={uiState.showRemoveDialog}
        onOpenChange={(showRemoveDialog) =>
          setUiState((current) => ({
            ...current,
            showRemoveDialog,
          }))
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("actions.removeMember")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("actions.confirmRemove", {
                name: member.name || member.email,
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {uiState.error && (
            <p className="text-sm text-destructive">{uiState.error}</p>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemove}
              disabled={uiState.isRemoving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {uiState.isRemoving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t("actions.removing")}
                </>
              ) : (
                t("actions.removeMember")
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
