"use client";

import type { WorkspaceUser } from "@/features/authentication/model";
import { api } from "@baseblocks/backend";
import { Delete01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Avatar, AvatarFallback, AvatarImage } from "@baseblocks/ui/avatar";
import { Button } from "@baseblocks/ui/button";
import { useConvexAuth, useQuery } from "convex/react";
import Link from "next/link";
import { useTranslations } from "next-intl";

export function AccountSection({ user }: { user: WorkspaceUser | null }) {
  const t = useTranslations("settings");
  const { isAuthenticated } = useConvexAuth();
  const deletionPlan = useQuery(
    api.organizations.getAccountDeletionPlan,
    isAuthenticated ? {} : "skip",
  );

  const initials = user?.name
    ? user.name.slice(0, 2).toUpperCase()
    : (user?.email?.[0]?.toUpperCase() ?? "?");

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-lg font-semibold tracking-tight">
          {t("accountTitle")}
        </h2>
        <div className="mt-5 flex items-center gap-4">
          <Avatar className="size-12 ring-1 ring-border">
            {user?.imageUrl ? <AvatarImage alt="" src={user.imageUrl} /> : null}
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate font-medium">
              {user?.name || t("anonymous")}
            </p>
            {user?.email ? (
              <p className="truncate text-sm text-muted-foreground">
                {user.email}
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <section className="rounded-xl bg-destructive/5 p-4 ring-1 ring-destructive/15">
        <h3 className="text-sm font-medium text-destructive">
          {t("dangerZone")}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {deletionPlan?.blockedWorkspaces.length
            ? t("deleteAccountTransferRequired", {
                count: deletionPlan.blockedWorkspaces.length,
              })
            : t("deleteAccountDescription", {
                count: deletionPlan?.deletableWorkspaces.length ?? 0,
              })}
        </p>
        {deletionPlan?.blockedWorkspaces.length ? (
          <ul className="mt-3 list-disc space-y-1 ps-5 text-sm text-muted-foreground">
            {deletionPlan.blockedWorkspaces.map((workspace) => (
              <li key={workspace.id}>{workspace.name}</li>
            ))}
          </ul>
        ) : null}
        {deletionPlan?.canDeleteAccount ? (
          <Button asChild className="mt-4" size="sm" variant="destructive">
            <Link href="/delete-account">
              <HugeiconsIcon icon={Delete01Icon} className="size-4" />
              {t("deleteAccount")}
            </Link>
          </Button>
        ) : (
          <Button className="mt-4" disabled size="sm" variant="destructive">
            <HugeiconsIcon icon={Delete01Icon} className="size-4" />
            {t("deleteAccount")}
          </Button>
        )}
      </section>
    </div>
  );
}
