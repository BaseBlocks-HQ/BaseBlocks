"use client";

import { authClient } from "@/lib/auth/client";
import { Button } from "@baseblocks/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@baseblocks/ui/dialog";
import { Input } from "@baseblocks/ui/input";
import { Label } from "@baseblocks/ui/label";
import { cn } from "@baseblocks/ui/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@baseblocks/ui/select";
import { UserPlus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

interface InviteMemberDialogProps {
  organizationId?: string;
}

const teamSelectTriggerClassName =
  "h-10 w-full rounded-[0.95rem] border-sidebar-border/80 bg-background/70 text-sidebar-foreground shadow-[inset_0_1px_0_hsl(var(--background)/0.35)]";

const teamEmailInputClassName =
  "h-auto border-0 bg-transparent px-0 py-0.5 text-[1.15rem] font-semibold leading-tight tracking-tight text-sidebar-foreground shadow-none placeholder:text-sidebar-foreground/40 focus-visible:ring-0 md:!text-[1.15rem] dark:bg-transparent";

export function InviteMemberDialog({
  organizationId,
}: InviteMemberDialogProps) {
  const t = useTranslations("team");
  const tCommon = useTranslations("common");

  const [dialogState, setDialogState] = useState<{
    open: boolean;
    email: string;
    role: "admin" | "editor";
    isInviting: boolean;
    error: string | null;
    success: boolean;
  }>({
    open: false,
    email: "",
    role: "editor",
    isInviting: false,
    error: null,
    success: false,
  });

  const resetForm = () => {
    setDialogState((current) => ({
      ...current,
      open: false,
      email: "",
      role: "editor",
      isInviting: false,
      error: null,
      success: false,
    }));
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      resetForm();
      return;
    }
    setDialogState((current) => ({
      ...current,
      open: true,
      error: null,
      success: false,
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmedEmail = dialogState.email.trim();
    if (!trimmedEmail) {
      setDialogState((current) => ({
        ...current,
        error: t("invite.emailRequired"),
      }));
      return;
    }
    if (!organizationId) {
      setDialogState((current) => ({
        ...current,
        error: t("invite.organizationRequired"),
      }));
      return;
    }

    setDialogState((current) => ({
      ...current,
      isInviting: true,
      error: null,
    }));

    try {
      const result = await authClient.organization.inviteMember({
        organizationId,
        email: trimmedEmail,
        role: dialogState.role,
      });
      if (result.error) throw result.error;

      setDialogState((current) => ({
        ...current,
        success: true,
        isInviting: false,
      }));

      window.setTimeout(() => {
        setDialogState({
          open: false,
          email: "",
          role: "editor",
          isInviting: false,
          error: null,
          success: false,
        });
      }, 1500);
    } catch (err) {
      setDialogState((current) => ({
        ...current,
        error:
          err instanceof Error ? err.message : t("invite.invitationFailed"),
        isInviting: false,
      }));
    }
  };

  return (
    <Dialog open={dialogState.open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button type="button" className="gap-2">
          <UserPlus className="h-4 w-4" />
          {t("inviteMember")}
        </Button>
      </DialogTrigger>
      <DialogContent
        className={
          "overflow-hidden rounded-[1.5rem] border-sidebar-border bg-sidebar p-0 text-sidebar-foreground shadow-2xl sm:max-w-[46rem] [&_[data-slot='dialog-close']]:top-4 [&_[data-slot='dialog-close']]:right-4"
        }
      >
        <DialogHeader className={"px-5 pt-4 pb-0"}>
          <DialogTitle className={"text-base font-semibold"}>
            {t("invite.title")}
          </DialogTitle>
        </DialogHeader>
        <form
          noValidate
          onSubmit={handleSubmit}
          className={cn("px-5 pb-3", "space-y-4 pb-4")}
        >
          <div>
            <Label
              htmlFor="invite-member-email"
              className="mb-0.5 block text-xs font-medium tracking-wide text-sidebar-foreground/55"
            >
              {t("member.email")}
            </Label>
            <Input
              id="invite-member-email"
              type="email"
              autoComplete="email"
              placeholder={t("invite.emailPlaceholder")}
              value={dialogState.email}
              onChange={(e) =>
                setDialogState((current) => ({
                  ...current,
                  email: e.target.value,
                  error: null,
                }))
              }
              aria-invalid={!!dialogState.error}
              className={teamEmailInputClassName}
            />
          </div>

          <div>
            <Label className="mb-2 block text-xs font-medium tracking-wide text-sidebar-foreground/55">
              {t("invite.selectRole")}
            </Label>
            <Select
              value={dialogState.role}
              onValueChange={(value) =>
                setDialogState((current) => ({
                  ...current,
                  role: value as "admin" | "editor",
                }))
              }
            >
              <SelectTrigger
                className={`${teamSelectTriggerClassName} [&_[data-slot='select-value']_.role-description]:hidden`}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-[1rem] border-sidebar-border bg-sidebar text-sidebar-foreground shadow-2xl">
                <SelectItem
                  value="admin"
                  className="rounded-[0.7rem] py-2 focus:bg-sidebar-accent focus:text-sidebar-accent-foreground"
                >
                  <span className="flex min-w-0 flex-col items-start gap-0.5">
                    <span>{t("roles.admin")}</span>
                    <span className="role-description text-xs font-normal leading-relaxed text-sidebar-foreground/60">
                      {t("roleDescriptions.admin")}
                    </span>
                  </span>
                </SelectItem>
                <SelectItem
                  value="editor"
                  className="rounded-[0.7rem] py-2 focus:bg-sidebar-accent focus:text-sidebar-accent-foreground"
                >
                  <span className="flex min-w-0 flex-col items-start gap-0.5">
                    <span>{t("roles.editor")}</span>
                    <span className="role-description text-xs font-normal leading-relaxed text-sidebar-foreground/60">
                      {t("roleDescriptions.editor")}
                    </span>
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {dialogState.error ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {dialogState.error}
            </p>
          ) : null}

          {dialogState.success ? (
            <p className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400">
              {t("invite.success")}
            </p>
          ) : null}
          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={dialogState.isInviting}
              className={
                "h-8 rounded-full border-sidebar-border/70 bg-transparent px-3.5 text-sm"
              }
            >
              {tCommon("cancel")}
            </Button>
            <Button
              type="submit"
              disabled={
                dialogState.isInviting ||
                !dialogState.email.trim() ||
                dialogState.success
              }
              className={"h-8 rounded-full px-4 text-sm"}
            >
              {dialogState.isInviting
                ? t("invite.inviting")
                : t("invite.invite")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
