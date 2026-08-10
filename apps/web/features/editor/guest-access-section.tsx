"use client";

import { workspaceApi } from "@/lib/convex/workspace-api";
import type { Id } from "@baseblocks/backend";
import { Button } from "@baseblocks/ui/button";
import { Input } from "@baseblocks/ui/input";
import { Label } from "@baseblocks/ui/label";
import { Spinner } from "@baseblocks/ui/spinner";
import { useMutation, useQuery } from "convex/react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

type GuestAccessList = {
  invitations: Array<{
    _id: Id<"pageGuestInvitations">;
    normalizedEmail: string;
    permission: "viewer" | "editor";
    status: string;
  }>;
  grants: Array<{
    _id: Id<"pageGuestGrants">;
    email: string;
    name?: string;
    permission: "viewer" | "editor";
  }>;
};

export function GuestAccessSection({ pageId }: { pageId: Id<"pages"> }) {
  const t = useTranslations("editor.share.guests");
  const locale = useLocale();
  const [email, setEmail] = useState("");
  const [permission, setPermission] = useState<"viewer" | "editor">("viewer");
  const [submitting, setSubmitting] = useState(false);
  const list = useQuery(workspaceApi.pageGuests.listForPage, { pageId }) as
    | GuestAccessList
    | undefined;
  const invite = useMutation(workspaceApi.pageGuests.invite);
  const updateGrant = useMutation(workspaceApi.pageGuests.updateGrant);
  const revokeGrant = useMutation(workspaceApi.pageGuests.revokeGrant);
  const revokeInvitation = useMutation(
    workspaceApi.pageGuests.revokeInvitation,
  );

  return (
    <section className="space-y-3 border-t border-sidebar-border/60 pt-4">
      <div>
        <h3 className="text-sm font-medium">{t("title")}</h3>
        <p className="text-xs text-sidebar-foreground/60">{t("description")}</p>
      </div>
      <form
        className="flex flex-col gap-2 sm:flex-row"
        onSubmit={async (event) => {
          event.preventDefault();
          setSubmitting(true);
          try {
            const result = (await invite({ pageId, email, permission })) as {
              token: string;
            };
            const link = `${window.location.origin}/${locale}/guest/invitations/${result.token}`;
            await navigator.clipboard.writeText(link);
            setEmail("");
            toast.success(t("linkCopied"));
          } catch (error) {
            toast.error(
              error instanceof Error ? error.message : t("inviteFailed"),
            );
          } finally {
            setSubmitting(false);
          }
        }}
      >
        <Label className="sr-only" htmlFor="page-guest-email">
          {t("email")}
        </Label>
        <Input
          className="flex-1"
          id="page-guest-email"
          onChange={(event) => setEmail(event.target.value)}
          placeholder="name@example.com"
          required
          type="email"
          value={email}
        />
        <Label className="sr-only" htmlFor="page-guest-permission">
          {t("permission")}
        </Label>
        <select
          className="h-9 rounded-md border bg-background px-3 text-sm"
          id="page-guest-permission"
          onChange={(event) =>
            setPermission(event.target.value as "viewer" | "editor")
          }
          value={permission}
        >
          <option value="viewer">{t("viewer")}</option>
          <option value="editor">{t("editor")}</option>
        </select>
        <Button disabled={submitting} type="submit">
          {submitting ? <Spinner className="size-4" /> : null}
          {t("createLink")}
        </Button>
      </form>
      {list ? (
        <div className="max-h-40 space-y-2 overflow-y-auto">
          {list.grants.map((grant) => (
            <div
              className="flex items-center gap-2 rounded-lg border border-sidebar-border/60 p-2 text-sm"
              key={grant._id}
            >
              <span className="min-w-0 flex-1 truncate">
                {grant.name || grant.email}
              </span>
              <select
                aria-label={t("permissionFor", {
                  name: grant.name || grant.email,
                })}
                className="rounded border bg-background px-2 py-1 text-xs"
                onChange={(event) =>
                  void updateGrant({
                    grantId: grant._id,
                    permission: event.target.value as "viewer" | "editor",
                  })
                }
                value={grant.permission}
              >
                <option value="viewer">{t("viewer")}</option>
                <option value="editor">{t("editor")}</option>
              </select>
              <Button
                onClick={() => void revokeGrant({ grantId: grant._id })}
                size="sm"
                type="button"
                variant="ghost"
              >
                {t("remove")}
              </Button>
            </div>
          ))}
          {list.invitations
            .filter((invitation) => invitation.status === "pending")
            .map((invitation) => (
              <div
                className="flex items-center gap-2 rounded-lg border border-dashed border-sidebar-border/60 p-2 text-sm"
                key={invitation._id}
              >
                <span className="min-w-0 flex-1 truncate">
                  {invitation.normalizedEmail} · {t("pending")}
                </span>
                <Button
                  onClick={() =>
                    void revokeInvitation({ invitationId: invitation._id })
                  }
                  size="sm"
                  type="button"
                  variant="ghost"
                >
                  {t("revoke")}
                </Button>
              </div>
            ))}
        </div>
      ) : null}
    </section>
  );
}
