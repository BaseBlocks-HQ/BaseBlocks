"use client";

import { getTeamDashboardPath } from "@/features/dashboard/routes";
import type {
  TeamRecord,
  WorkspaceUser,
} from "@/features/authentication/model";
import { useRouter } from "@/i18n/navigation";
import { authClient } from "@/lib/auth/client";
import { api } from "@baseblocks/backend";
import { Delete01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  type OrganizationRole,
  roleHasPermission,
} from "@baseblocks/backend/auth-permissions";
import { SLUG_PATTERN } from "@baseblocks/domain";
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
import { Avatar, AvatarFallback, AvatarImage } from "@baseblocks/ui/avatar";
import { Button } from "@baseblocks/ui/button";
import { Input } from "@baseblocks/ui/input";
import { Label } from "@baseblocks/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@baseblocks/ui/select";
import { Spinner } from "@baseblocks/ui/spinner";
import { useMutation, useQuery } from "convex/react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type Member = {
  _id: string;
  userId?: string;
  email: string;
  name?: string;
  imageUrl?: string;
  role: OrganizationRole;
};

const slugPattern = new RegExp(`^${SLUG_PATTERN}$`);

export function OrganizationManagement({
  organization,
  currentOrganizationId,
  remainingWorkspaceSlug,
  user,
}: {
  organization: TeamRecord;
  currentOrganizationId: string;
  remainingWorkspaceSlug: string | null;
  user: WorkspaceUser | null;
}) {
  const t = useTranslations("settings.organizations");
  const router = useRouter();
  const canUpdate = roleHasPermission(organization.memberRole, {
    resource: "organization",
    action: "update",
  });
  const canDelete = roleHasPermission(organization.memberRole, {
    resource: "organization",
    action: "delete",
  });
  const members = useQuery(api.organizations.listMembers, {
    organizationId: organization._id,
  }) as Member[] | undefined;
  const transferOwnership = useMutation(api.organizations.transferOwnership);
  const [name, setName] = useState(organization.name);
  const [slug, setSlug] = useState(organization.slug);
  const [slugTouched, setSlugTouched] = useState(false);
  const [targetMemberId, setTargetMemberId] = useState("");
  const [working, setWorking] = useState<
    "save" | "leave" | "transfer" | "delete" | null
  >(null);
  const [confirm, setConfirm] = useState<
    "leave" | "transfer" | "delete" | null
  >(null);

  useEffect(() => {
    setName(organization.name);
    setSlug(organization.slug);
    setSlugTouched(false);
    setTargetMemberId("");
  }, [organization]);

  const otherMembers =
    members?.filter((member) => member.userId !== user?.id) ?? [];
  const owner = members?.find((member) => member.role === "owner");
  const slugIsInvalid = slugTouched && !slugPattern.test(slug);

  const saveIdentity = async (event: React.FormEvent) => {
    event.preventDefault();
    setSlugTouched(true);
    if (!slugPattern.test(slug)) return;
    setWorking("save");
    try {
      const nextSlug = slug.trim().toLowerCase();
      const result = await authClient.organization.update({
        organizationId: organization._id,
        data: { name: name.trim(), slug: nextSlug },
      });
      if (result.error) throw result.error;
      toast.success(t("saved"));
      if (
        organization._id === currentOrganizationId &&
        nextSlug !== organization.slug
      ) {
        router.push(getTeamDashboardPath(nextSlug));
      }
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("saveFailed"));
    } finally {
      setWorking(null);
    }
  };

  const runLeave = async () => {
    setWorking("leave");
    try {
      const result = await authClient.organization.leave({
        organizationId: organization._id,
      });
      if (result.error) throw result.error;
      toast.success(t("left", { name: organization.name }));
      window.location.href = remainingWorkspaceSlug
        ? getTeamDashboardPath(remainingWorkspaceSlug)
        : "/onboarding";
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("leaveFailed"));
      setWorking(null);
      setConfirm(null);
    }
  };

  const runTransfer = async () => {
    if (!targetMemberId) return;
    setWorking("transfer");
    try {
      await transferOwnership({
        organizationId: organization._id,
        targetMemberId,
      });
      toast.success(t("transferred"));
      setConfirm(null);
      setTargetMemberId("");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("transferFailed"));
    } finally {
      setWorking(null);
    }
  };

  const runDelete = async () => {
    setWorking("delete");
    try {
      const response = await fetch(`/api/organizations/${organization._id}`, {
        method: "DELETE",
      });
      const body = (await response.json()) as {
        error?: string;
        nextSlug?: string | null;
      };
      if (!response.ok) throw new Error(body.error || t("deleteFailed"));
      toast.success(t("deleted", { name: organization.name }));
      window.location.href = body.nextSlug
        ? getTeamDashboardPath(body.nextSlug)
        : "/onboarding";
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("deleteFailed"));
      setWorking(null);
      setConfirm(null);
    }
  };

  return (
    <div className="space-y-10">
      <section aria-labelledby="workspace-details-title" className="space-y-4">
        {canUpdate ? (
          <form
            className="space-y-4"
            id="workspace-details-form"
            onSubmit={saveIdentity}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-medium" id="workspace-details-title">
                {t("details")}
              </h2>
              <Button
                disabled={working !== null}
                form="workspace-details-form"
                size="compact"
                type="submit"
              >
                {working === "save" ? <Spinner className="size-3.5" /> : null}
                {t("save")}
              </Button>
            </div>
            <div className="space-y-2">
              <Label htmlFor="organization-name">{t("name")}</Label>
              <Input
                className="h-8"
                id="organization-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="organization-slug">{t("slug")}</Label>
              <Input
                aria-describedby={
                  slugIsInvalid ? "organization-slug-error" : undefined
                }
                aria-invalid={slugIsInvalid}
                className="h-8"
                id="organization-slug"
                pattern={SLUG_PATTERN}
                value={slug}
                onChange={(event) => {
                  setSlug(event.target.value.toLowerCase());
                  setSlugTouched(true);
                }}
                onInvalid={(event) => {
                  event.preventDefault();
                  setSlugTouched(true);
                }}
                required
              />
              {slugIsInvalid ? (
                <p
                  className="text-xs text-destructive"
                  id="organization-slug-error"
                >
                  {t("slugHint")}
                </p>
              ) : null}
            </div>
          </form>
        ) : (
          <div className="space-y-3">
            <div>
              <h2 className="text-sm font-medium" id="workspace-details-title">
                {t("details")}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("readOnly")}
              </p>
            </div>
            <dl className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/[0.06]">
              <div className="grid gap-1 px-4 py-3 sm:grid-cols-[8rem_1fr] sm:items-center">
                <dt className="text-xs text-muted-foreground">{t("name")}</dt>
                <dd className="text-sm font-medium">{organization.name}</dd>
              </div>
              <div className="grid gap-1 border-t border-foreground/[0.06] px-4 py-3 sm:grid-cols-[8rem_1fr] sm:items-center">
                <dt className="text-xs text-muted-foreground">{t("slug")}</dt>
                <dd className="text-sm font-medium">{organization.slug}</dd>
              </div>
            </dl>
          </div>
        )}
      </section>

      <section
        aria-labelledby="workspace-ownership-title"
        className="space-y-3"
      >
        <h2 className="text-sm font-medium" id="workspace-ownership-title">
          {t("ownership")}
        </h2>
        {members === undefined ? (
          <div
            className="flex items-center gap-2 text-sm text-muted-foreground"
            role="status"
          >
            <Spinner className="size-4" />
            {t("membersLoading")}
          </div>
        ) : owner ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3 rounded-xl bg-card px-4 py-3 ring-1 ring-foreground/[0.06]">
              <Avatar className="size-9">
                {owner.imageUrl ? <AvatarImage src={owner.imageUrl} /> : null}
                <AvatarFallback>
                  {(owner.name?.[0] || owner.email[0] || "?").toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {owner.name || owner.email}
                </p>
                {owner.name ? (
                  <p className="truncate text-xs text-muted-foreground">
                    {owner.email}
                  </p>
                ) : null}
              </div>
              <p className="shrink-0 text-xs text-muted-foreground">
                {owner.userId === user?.id
                  ? t("currentOwner")
                  : t("workspaceOwner")}
              </p>
            </div>
            {canDelete && otherMembers.length > 0 ? (
              <div>
                <p className="mb-2 text-sm text-muted-foreground">
                  {t("ownershipDescription")}
                </p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Select
                    disabled={working !== null}
                    value={targetMemberId}
                    onValueChange={setTargetMemberId}
                  >
                    <SelectTrigger
                      className="min-w-0 flex-1 [&>span]:truncate"
                      size="sm"
                    >
                      <SelectValue placeholder={t("selectOwner")} />
                    </SelectTrigger>
                    <SelectContent>
                      {otherMembers.map((member) => (
                        <SelectItem key={member._id} value={member._id}>
                          {member.name || member.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {targetMemberId ? (
                    <Button
                      disabled={working !== null}
                      onClick={() => setConfirm("transfer")}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      {working === "transfer" ? (
                        <Spinner className="size-4" />
                      ) : null}
                      {t("transfer")}
                    </Button>
                  ) : null}
                </div>
              </div>
            ) : canDelete ? (
              <p className="text-sm text-muted-foreground">
                {t("inviteBeforeTransfer")}
              </p>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            {t("ownerUnavailable")}
          </p>
        )}
      </section>

      <section
        aria-labelledby="workspace-danger-zone-title"
        className="space-y-3"
      >
        <h2
          className="text-sm font-medium text-destructive"
          id="workspace-danger-zone-title"
        >
          {t("dangerZone")}
        </h2>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">
            {canDelete ? t("deleteDescription") : t("leaveDescription")}
          </p>
          {!canDelete ? (
            <Button
              className="shrink-0"
              disabled={working !== null}
              onClick={() => setConfirm("leave")}
              size="compact"
              type="button"
              variant="outline"
            >
              {working === "leave" ? <Spinner className="size-4" /> : null}
              {t("leave")}
            </Button>
          ) : (
            <Button
              className="shrink-0"
              disabled={working !== null}
              onClick={() => setConfirm("delete")}
              size="compact"
              type="button"
              variant="destructive"
            >
              {working === "delete" ? <Spinner className="size-4" /> : null}
              <HugeiconsIcon
                aria-hidden="true"
                className="size-3.5"
                icon={Delete01Icon}
              />
              {t("delete")}
            </Button>
          )}
        </div>
      </section>

      <AlertDialog
        open={confirm !== null}
        onOpenChange={() => setConfirm(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm === "delete"
                ? t("deleteTitle")
                : confirm === "transfer"
                  ? t("transferTitle")
                  : t("leaveTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm === "delete"
                ? t("deleteConfirm", { name: organization.name })
                : confirm === "transfer"
                  ? t("transferConfirm")
                  : t("leaveConfirm", { name: organization.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={working !== null}>
              {t("cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={working !== null}
              onClick={(event) => {
                event.preventDefault();
                void (confirm === "delete"
                  ? runDelete()
                  : confirm === "transfer"
                    ? runTransfer()
                    : runLeave());
              }}
            >
              {working ? <Spinner className="size-4" /> : null}
              {confirm === "delete"
                ? t("delete")
                : confirm === "transfer"
                  ? t("transfer")
                  : t("leave")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
