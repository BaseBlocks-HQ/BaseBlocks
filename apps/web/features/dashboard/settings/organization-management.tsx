"use client";

import { getTeamDashboardPath } from "@/features/dashboard/routes";
import type {
  TeamRecord,
  WorkspaceUser,
} from "@/features/authentication/model";
import { useRouter } from "@/i18n/navigation";
import { authClient } from "@/lib/auth/client";
import { api } from "@baseblocks/backend";
import {
  type OrganizationRole,
  roleHasPermission,
} from "@baseblocks/backend/auth-permissions";
import { SLUG_PATTERN } from "@baseblocks/domain";
import { getPrimaryOrganizationRole } from "@baseblocks/backend/organization-policy";
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
import { Badge } from "@baseblocks/ui/badge";
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
  role: OrganizationRole;
};

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
  const role = getPrimaryOrganizationRole(organization.memberRole);
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
    setTargetMemberId("");
  }, [organization]);

  const otherMembers =
    members?.filter((member) => member.userId !== user?.id) ?? [];
  const roleLabel = t(`roles.${role}`);

  const saveIdentity = async (event: React.FormEvent) => {
    event.preventDefault();
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
    <div className="space-y-8">
      <div>
        <div className="mb-5 flex flex-wrap items-center gap-2">
          <h3 className="text-base font-semibold">{organization.name}</h3>
          <Badge variant="secondary">{roleLabel}</Badge>
        </div>
        <form className="space-y-4" onSubmit={saveIdentity}>
          <div className="space-y-2">
            <Label htmlFor="organization-name">{t("name")}</Label>
            <Input
              disabled={!canUpdate}
              id="organization-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="organization-slug">{t("slug")}</Label>
            <Input
              disabled={!canUpdate}
              id="organization-slug"
              pattern={SLUG_PATTERN}
              value={slug}
              onChange={(event) => setSlug(event.target.value.toLowerCase())}
              required
            />
            <p className="text-xs text-muted-foreground">{t("slugHint")}</p>
          </div>
          {canUpdate ? (
            <Button disabled={working === "save"} size="sm" type="submit">
              {working === "save" ? <Spinner className="size-4" /> : null}
              {t("save")}
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground">{t("readOnly")}</p>
          )}
        </form>
      </div>

      {canDelete ? (
        <div className="space-y-3">
          <div>
            <h4 className="text-sm font-medium">{t("ownership")}</h4>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("ownershipDescription")}
            </p>
          </div>
          {otherMembers.length > 0 ? (
            <div className="flex flex-col gap-2 sm:flex-row">
              <Select value={targetMemberId} onValueChange={setTargetMemberId}>
                <SelectTrigger className="min-w-0 flex-1">
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
              <Button
                disabled={!targetMemberId}
                onClick={() => setConfirm("transfer")}
                type="button"
                variant="outline"
              >
                {t("transfer")}
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {t("inviteBeforeTransfer")}
            </p>
          )}
        </div>
      ) : null}

      <div className="space-y-3 rounded-xl bg-destructive/5 p-4 ring-1 ring-destructive/15">
        <div>
          <h4 className="text-sm font-medium text-destructive">
            {t("dangerZone")}
          </h4>
          <p className="mt-1 text-sm text-muted-foreground">
            {canDelete ? t("deleteDescription") : t("leaveDescription")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!canDelete ? (
            <Button variant="outline" onClick={() => setConfirm("leave")}>
              {t("leave")}
            </Button>
          ) : null}
          {canDelete ? (
            <Button variant="destructive" onClick={() => setConfirm("delete")}>
              {t("delete")}
            </Button>
          ) : null}
        </div>
      </div>

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
