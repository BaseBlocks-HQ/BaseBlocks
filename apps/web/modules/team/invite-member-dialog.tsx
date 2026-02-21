"use client";

import { authClient } from "@/lib/auth/client";
import { useTeam } from "@/lib/data";
import type { Id } from "@baseblocks/backend";
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
  teamId: Id<"teams">;
}

export function InviteMemberDialog(_props: InviteMemberDialogProps) {
  const t = useTranslations("team");

  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "member">("member");
  const [isInviting, setIsInviting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const team = useTeam();

  const handleInvite = async () => {
    if (!email.trim()) return;

    setIsInviting(true);
    setError(null);

    try {
      if (!team?.organizationId) {
        throw new Error("Team is not linked to an organization");
      }

      await authClient.organization.inviteMember({
        organizationId: team.organizationId,
        email: email.trim(),
        role,
      });

      setSuccess(true);
      setTimeout(() => {
        setOpen(false);
        resetForm();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invitation failed");
    } finally {
      setIsInviting(false);
    }
  };

  const resetForm = () => {
    setEmail("");
    setRole("member");
    setError(null);
    setSuccess(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        setOpen(value);
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
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label>{t("invite.selectRole")}</Label>
            <Select
              value={role}
              onValueChange={(value) => setRole(value as "admin" | "member")}
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
                    <span>{t("roles.viewer")}</span>
                    <span className="text-xs text-muted-foreground">
                      {t("roleDescriptions.viewer")}
                    </span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded">
              {error}
            </p>
          )}

          {success && (
            <p className="text-sm text-green-600 bg-green-50 dark:bg-green-950 px-3 py-2 rounded">
              {t("invite.success")}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!email.trim() || isInviting || success}
              onClick={handleInvite}
            >
              {isInviting ? (
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
