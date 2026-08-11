"use client";

import type { WorkspaceUser } from "@/features/authentication/model";
import { api } from "@baseblocks/backend";
import { Delete01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Avatar, AvatarFallback, AvatarImage } from "@baseblocks/ui/avatar";
import { Button } from "@baseblocks/ui/button";
import { Spinner } from "@baseblocks/ui/spinner";
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
  const isLoading = deletionPlan === undefined;
  const blockedWorkspaces = deletionPlan?.blockedWorkspaces ?? [];

  return (
    <div className="space-y-10">
      <section>
        <div className="flex items-center gap-4">
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

      <section
        aria-busy={isLoading}
        aria-labelledby="account-danger-zone"
        className="space-y-3"
      >
        <h2
          className="text-sm font-medium text-destructive"
          id="account-danger-zone"
        >
          {t("dangerZone")}
        </h2>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 max-w-prose">
            <p className="text-sm leading-relaxed text-muted-foreground">
              {isLoading
                ? t("deleteAccountStatusLoading")
                : blockedWorkspaces.length
                  ? t("deleteAccountTransferRequired", {
                      count: blockedWorkspaces.length,
                    })
                  : t("deleteAccountDescription", {
                      count: deletionPlan?.deletableWorkspaces.length ?? 0,
                    })}
            </p>
            {blockedWorkspaces.length ? (
              <ul className="mt-2 list-disc space-y-1 ps-5 text-sm text-muted-foreground">
                {blockedWorkspaces.map((workspace) => (
                  <li key={workspace.id}>{workspace.name}</li>
                ))}
              </ul>
            ) : null}
          </div>
          {deletionPlan?.canDeleteAccount ? (
            <Button
              asChild
              className="shrink-0"
              size="compact"
              variant="destructive"
            >
              <Link href="/delete-account">
                <HugeiconsIcon
                  aria-hidden="true"
                  icon={Delete01Icon}
                  className="size-4"
                />
                {t("deleteAccount")}
              </Link>
            </Button>
          ) : (
            <Button
              className="shrink-0"
              disabled
              size="compact"
              variant="destructive"
            >
              {isLoading ? <Spinner className="size-4" /> : null}
              <HugeiconsIcon
                aria-hidden="true"
                icon={Delete01Icon}
                className="size-4"
              />
              {t("deleteAccount")}
            </Button>
          )}
        </div>
      </section>
    </div>
  );
}
