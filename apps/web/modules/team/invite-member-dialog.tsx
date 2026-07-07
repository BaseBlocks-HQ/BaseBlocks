"use client";

import { DashboardFormDialog } from "@/modules/shared/dialogs";
import { authClient } from "@/lib/auth/client";
import { getAuthClientDataOrThrow } from "@/lib/auth/result";
import { Button } from "@baseblocks/ui/button";
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

  const resetForm = () => {
    setDialogState((current) => ({
      ...current,
      open: false,
      email: "",
      role: "member",
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
      getAuthClientDataOrThrow(
        await authClient.organization.inviteMember({
          organizationId,
          email: trimmedEmail,
          role: dialogState.role,
        }),
        t("invite.invitationFailed"),
      );

      setDialogState((current) => ({
        ...current,
        success: true,
        isInviting: false,
      }));

      window.setTimeout(() => {
        setDialogState({
          open: false,
          email: "",
          role: "member",
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
    <DashboardFormDialog
      open={dialogState.open}
      onOpenChange={handleOpenChange}
      title={t("invite.title")}
      description={t("invite.description")}
      trigger={
        <Button type="button" className="gap-2">
          <UserPlus className="h-4 w-4" />
          {t("inviteMember")}
        </Button>
      }
      onSubmit={handleSubmit}
      isSubmitting={dialogState.isInviting}
      submitDisabled={!dialogState.email.trim() || dialogState.success}
      submitLabel={t("invite.invite")}
      submittingLabel={t("invite.inviting")}
      cancelLabel={tCommon("cancel")}
      bodyClassName="px-5 pb-4"
      formClassName="space-y-4"
      footerClassName="pt-2"
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

      <div className="rounded-[1.1rem] border border-sidebar-border/80 bg-background/55 p-3 shadow-[inset_0_1px_0_hsl(var(--background)/0.4)]">
        <Label className="mb-2 block text-xs font-medium tracking-wide text-sidebar-foreground/55">
          {t("invite.selectRole")}
        </Label>
        <Select
          value={dialogState.role}
          onValueChange={(value) =>
            setDialogState((current) => ({
              ...current,
              role: value as "admin" | "member",
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
              value="member"
              className="rounded-[0.7rem] py-2 focus:bg-sidebar-accent focus:text-sidebar-accent-foreground"
            >
              {t("roles.editor")}
            </SelectItem>
          </SelectContent>
        </Select>
        <p className="mt-2.5 text-pretty text-sm leading-relaxed text-sidebar-foreground/60">
          {dialogState.role === "admin"
            ? t("roleDescriptions.admin")
            : t("roleDescriptions.editor")}
        </p>
      </div>

      {dialogState.error ? (
        <p
          className={cn(
            "rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive",
          )}
        >
          {dialogState.error}
        </p>
      ) : null}

      {dialogState.success ? (
        <p
          className={cn(
            "rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400",
          )}
        >
          {t("invite.success")}
        </p>
      ) : null}
    </DashboardFormDialog>
  );
}
