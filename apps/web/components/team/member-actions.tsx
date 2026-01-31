"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEntityAuth } from "@/lib/auth";
import { api } from "@repo/backend";
import type { Id } from "@repo/backend";
import { useAction, useMutation } from "convex/react";
import { Loader2, MoreHorizontal, Shield, UserMinus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

interface Member {
  _id: Id<"members">;
  eaUserId: string;
  email: string;
  name?: string;
  role: "admin" | "viewer";
  eaRole: string;
  isOwner: boolean;
}

interface MemberActionsProps {
  member: Member;
  companyId: Id<"companies">;
  isCurrentUserAdmin: boolean;
}

export function MemberActions({
  member,
  companyId,
  isCurrentUserAdmin,
}: MemberActionsProps) {
  const t = useTranslations("team");
  const { getToken, user } = useEntityAuth();

  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [isChangingRole, setIsChangingRole] = useState(false);
  const [newRole, setNewRole] = useState<"admin" | "viewer">(member.role);
  const [error, setError] = useState<string | null>(null);

  const removeMemberAction = useAction(api.members.actions.removeMemberFromOrg);
  const updateRoleMutation = useMutation(api.members.mutations.updateRole);

  const isCurrentUser = user?.id === member.eaUserId;
  const canModify = isCurrentUserAdmin && !member.isOwner && !isCurrentUser;

  const handleRemove = async () => {
    setIsRemoving(true);
    setError(null);

    try {
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");

      await removeMemberAction({
        companyId,
        memberId: member._id,
        accessToken: token,
      });

      setShowRemoveDialog(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove member");
    } finally {
      setIsRemoving(false);
    }
  };

  const handleRoleChange = async () => {
    if (newRole === member.role) {
      setShowRoleDialog(false);
      return;
    }

    setIsChangingRole(true);
    setError(null);

    try {
      await updateRoleMutation({
        memberId: member._id,
        role: newRole,
      });

      setShowRoleDialog(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to change role");
    } finally {
      setIsChangingRole(false);
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
          <DropdownMenuItem onClick={() => setShowRoleDialog(true)}>
            <Shield className="h-4 w-4 mr-2" />
            {t("actions.changeRole")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive"
            onClick={() => setShowRemoveDialog(true)}
          >
            <UserMinus className="h-4 w-4 mr-2" />
            {t("actions.removeMember")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Change Role Dialog */}
      <AlertDialog open={showRoleDialog} onOpenChange={setShowRoleDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("actions.changeRole")}</AlertDialogTitle>
            <AlertDialogDescription>
              Change the role for {member.name || member.email}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="py-4">
            <Select
              value={newRole}
              onValueChange={(value) => setNewRole(value as "admin" | "viewer")}
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

            {error && <p className="text-sm text-destructive mt-2">{error}</p>}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRoleChange}
              disabled={isChangingRole || newRole === member.role}
            >
              {isChangingRole && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Save
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Remove Member Dialog */}
      <AlertDialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("actions.removeMember")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("actions.confirmRemove", {
                name: member.name || member.email,
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemove}
              disabled={isRemoving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isRemoving ? (
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
