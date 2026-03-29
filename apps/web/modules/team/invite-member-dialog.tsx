"use client";

import { authClient } from "@/lib/auth/client";
import { Button } from "@baseblocks/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@baseblocks/ui/dialog";
import { Input } from "@baseblocks/ui/input";
import { Label } from "@baseblocks/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@baseblocks/ui/select";
import { Loader2, UserPlus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

interface InviteMemberDialogProps {
  organizationId?: string;
}

export function InviteMemberDialog({
  organizationId,
}: InviteMemberDialogProps) {
  const t = useTranslations("team");

  const [dialogState, setDialogState] = useState<{
    open: boolean;
    email: string;
    role: "admin" | "member";
    isInviting: boolean;
    error: string | null;
    success: boolean;
  }>({
    open: false,
    email: "",
    role: "member",
    isInviting: false,
    error: null,
    success: false,
  });

  const handleInvite = async () => {
    const trimmedEmail = dialogState.email.trim();
    if (!trimmedEmail) return;
    if (!organizationId) {
      setDialogState((current) => ({
        ...current,
        error: "Team is not linked to an organization",
      }));
      return;
    }

    setDialogState((current) => ({
      ...current,
      isInviting: true,
      error: null,
    }));

    try {
      await authClient.organization.inviteMember({
        organizationId,
        email: trimmedEmail,
        role: dialogState.role,
      });

      setDialogState((current) => ({
        ...current,
        success: true,
      }));
      setTimeout(() => {
        setDialogState((current) => ({
          ...current,
          open: false,
        }));
        resetForm();
      }, 1500);
      setDialogState((current) => ({
        ...current,
        isInviting: false,
      }));
    } catch (err) {
      setDialogState((current) => ({
        ...current,
        error: err instanceof Error ? err.message : "Invitation failed",
        isInviting: false,
      }));
    }
  };

  const resetForm = () => {
    setDialogState((current) => ({
      ...current,
      email: "",
      role: "member",
      error: null,
      success: false,
    }));
  };

  return (
    <Dialog
      open={dialogState.open}
      onOpenChange={(value) => {
        setDialogState((current) => ({
          ...current,
          open: value,
        }));
        if (!value) resetForm();
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="h-4 w-4 mr-2" />
          {t("inviteMember")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("invite.title")}</DialogTitle>
          <DialogDescription>{t("invite.description")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{t("invite.searchPlaceholder")}</Label>
            <Input
              type="email"
              placeholder="user@example.com"
              value={dialogState.email}
              onChange={(e) =>
                setDialogState((current) => ({
                  ...current,
                  email: e.target.value,
                }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label>{t("invite.selectRole")}</Label>
            <Select
              value={dialogState.role}
              onValueChange={(value) =>
                setDialogState((current) => ({
                  ...current,
                  role: value as "admin" | "member",
                }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">
                  <div className="flex flex-col">
                    <span>{t("roles.admin")}</span>
                    <span className="text-xs text-muted-foreground">
                      {t("roleDescriptions.admin")}
                    </span>
                  </div>
                </SelectItem>
                <SelectItem value="member">
                  <div className="flex flex-col">
                    <span>{t("roles.editor")}</span>
                    <span className="text-xs text-muted-foreground">
                      {t("roleDescriptions.editor")}
                    </span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {dialogState.error && (
            <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded">
              {dialogState.error}
            </p>
          )}

          {dialogState.success && (
            <p className="text-sm text-green-600 bg-green-50 dark:bg-green-950 px-3 py-2 rounded">
              {t("invite.success")}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setDialogState((current) => ({
                  ...current,
                  open: false,
                }))
              }
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={
                !dialogState.email.trim() ||
                dialogState.isInviting ||
                dialogState.success
              }
              onClick={handleInvite}
            >
              {dialogState.isInviting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t("invite.inviting")}
                </>
              ) : (
                t("invite.invite")
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
