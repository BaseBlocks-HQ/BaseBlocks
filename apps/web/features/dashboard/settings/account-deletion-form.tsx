"use client";

import { Button } from "@baseblocks/ui/button";
import { Input } from "@baseblocks/ui/input";
import { Label } from "@baseblocks/ui/label";
import { Spinner } from "@baseblocks/ui/spinner";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";

type DeletableWorkspace = { id: string; name: string };

export function AccountDeletionForm({
  email,
  workspaces,
  sharedWorkspaceCount,
  cancelHref,
}: {
  email: string;
  workspaces: DeletableWorkspace[];
  sharedWorkspaceCount: number;
  cancelHref: string;
}) {
  const t = useTranslations("settings");
  const tCommon = useTranslations("common");
  const [confirmationEmail, setConfirmationEmail] = useState("");
  const [deleting, setDeleting] = useState(false);
  const matches =
    confirmationEmail.trim().toLowerCase() === email.trim().toLowerCase();

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg items-center px-6 py-12">
      <section className="w-full space-y-6 rounded-2xl border bg-card p-6 shadow-sm">
        <div className="space-y-2">
          <h1 className="text-xl font-semibold">{t("deleteConfirmTitle")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("deleteConfirmDescription", {
              count: workspaces.length,
              sharedCount: sharedWorkspaceCount,
            })}
          </p>
        </div>
        {workspaces.length ? (
          <ul className="list-disc space-y-1 ps-5 text-sm text-muted-foreground">
            {workspaces.map((workspace) => (
              <li key={workspace.id}>{workspace.name}</li>
            ))}
          </ul>
        ) : null}
        <form
          action="/api/account"
          className="space-y-4"
          method="post"
          onSubmit={() => setDeleting(true)}
        >
          <div className="space-y-2">
            <Label htmlFor="account-deletion-email">
              {t("deleteConfirmEmailLabel")}
            </Label>
            <Input
              autoComplete="off"
              autoFocus
              id="account-deletion-email"
              name="confirmationEmail"
              onChange={(event) => setConfirmationEmail(event.target.value)}
              placeholder={email}
              readOnly={deleting}
              value={confirmationEmail}
            />
          </div>
          <div className="flex justify-end gap-2">
            {deleting ? (
              <Button disabled variant="outline">
                {tCommon("cancel")}
              </Button>
            ) : (
              <Button asChild variant="outline">
                <Link href={cancelHref}>{tCommon("cancel")}</Link>
              </Button>
            )}
            <Button
              disabled={deleting || !matches}
              type="submit"
              variant="destructive"
            >
              {deleting ? <Spinner className="size-4" /> : null}
              {deleting
                ? t("deleting")
                : t("deleteConfirmAction", { count: workspaces.length })}
            </Button>
          </div>
        </form>
      </section>
    </main>
  );
}
