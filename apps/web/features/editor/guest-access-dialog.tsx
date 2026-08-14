"use client";

import { workspaceApi } from "@/lib/convex/workspace-api";
import type { Id } from "@baseblocks/backend";
import { Button } from "@baseblocks/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
import { Spinner } from "@baseblocks/ui/spinner";
import { UserIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useMutation, useQuery } from "convex/react";
import { useLocale, useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { toast } from "sonner";

type Permission = "viewer" | "editor";

type GuestAccessList = {
  invitations: Array<{
    _id: Id<"pageGuestInvitations">;
    normalizedEmail: string;
    permission: Permission;
    status: string;
  }>;
  grants: Array<{
    _id: Id<"pageGuestGrants">;
    email: string;
    name?: string;
    permission: Permission;
  }>;
};

export function GuestAccessDialog({
  onOpenChange,
  pageId,
  returnFocusTo,
}: {
  onOpenChange: (open: boolean) => void;
  pageId: Id<"pages">;
  returnFocusTo?: HTMLElement | null;
}) {
  const t = useTranslations("editor.guests");
  const locale = useLocale();
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [email, setEmail] = useState("");
  const [permission, setPermission] = useState<Permission>("viewer");
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
  const pendingInvitations =
    list?.invitations.filter((invitation) => invitation.status === "pending") ??
    [];
  const hasGuests = Boolean(list?.grants.length || pendingInvitations.length);

  const handleInvite = async (event: React.FormEvent<HTMLFormElement>) => {
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
      toast.error(error instanceof Error ? error.message : t("inviteFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleGrantPermission = async (
    grantId: Id<"pageGuestGrants">,
    nextPermission: string,
  ) => {
    try {
      await updateGrant({
        grantId,
        permission: nextPermission as Permission,
      });
    } catch {
      toast.error(t("updateFailed"));
    }
  };

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent
        className="w-[calc(100%-1.5rem)] max-w-[34rem] gap-0 overflow-hidden rounded-2xl border-0 bg-background/80 p-0 text-foreground shadow-2xl backdrop-blur-xl backdrop-saturate-150 sm:max-w-[34rem] [&_[data-slot='dialog-close']]:top-2 [&_[data-slot='dialog-close']]:right-2 [&_[data-slot='dialog-close']]:flex [&_[data-slot='dialog-close']]:size-8 [&_[data-slot='dialog-close']]:items-center [&_[data-slot='dialog-close']]:justify-center [&_[data-slot='dialog-close']]:rounded-lg"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          titleRef.current?.focus();
        }}
        returnFocusTo={returnFocusTo}
      >
        <DialogHeader className="px-4 pt-4 pe-12">
          <DialogTitle
            className="brand-display text-2xl leading-none font-normal tracking-[-0.025em]"
            ref={titleRef}
            tabIndex={-1}
          >
            {t("title")}
          </DialogTitle>
          <DialogDescription className="pt-1 text-sm text-muted-foreground">
            {t("description")}
          </DialogDescription>
        </DialogHeader>

        <form
          className="grid gap-2 px-4 pt-4 sm:grid-cols-[minmax(0,1fr)_8.5rem_auto]"
          onSubmit={handleInvite}
        >
          <div>
            <Label className="sr-only" htmlFor="page-guest-email">
              {t("email")}
            </Label>
            <Input
              autoComplete="email"
              id="page-guest-email"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@example.com"
              required
              type="email"
              value={email}
            />
          </div>
          <div>
            <Label className="sr-only" htmlFor="page-guest-permission">
              {t("permission")}
            </Label>
            <Select
              onValueChange={(value) => setPermission(value as Permission)}
              value={permission}
            >
              <SelectTrigger className="w-full" id="page-guest-permission">
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="start">
                <SelectItem value="viewer">{t("viewer")}</SelectItem>
                <SelectItem value="editor">{t("editor")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button disabled={submitting} type="submit">
            {submitting ? <Spinner className="size-4" /> : null}
            {t("invite")}
          </Button>
        </form>

        <section className="min-h-32 px-4 pt-5 pb-4">
          <h3 className="text-sm font-medium">{t("accessTitle")}</h3>
          {list === undefined ? (
            <div className="flex min-h-28 items-center justify-center">
              <Spinner className="size-5 text-muted-foreground" />
              <span className="sr-only">{t("loading")}</span>
            </div>
          ) : hasGuests ? (
            <div className="mt-2 max-h-64 space-y-1 overflow-y-auto overscroll-contain">
              {list.grants.map((grant) => {
                const name = grant.name || grant.email;
                return (
                  <div
                    className="flex min-w-0 items-center gap-2 rounded-xl bg-muted/50 p-2"
                    key={grant._id}
                  >
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-background text-muted-foreground shadow-xs">
                      <HugeiconsIcon aria-hidden icon={UserIcon} />
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm">
                      {name}
                    </span>
                    <Select
                      onValueChange={(value) =>
                        void handleGrantPermission(grant._id, value)
                      }
                      value={grant.permission}
                    >
                      <SelectTrigger
                        aria-label={t("permissionFor", { name })}
                        className="w-28"
                        size="sm"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent align="end">
                        <SelectItem value="viewer">{t("viewer")}</SelectItem>
                        <SelectItem value="editor">{t("editor")}</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      onClick={() => void revokeGrant({ grantId: grant._id })}
                      size="sm"
                      type="button"
                      variant="ghost"
                    >
                      {t("remove")}
                    </Button>
                  </div>
                );
              })}
              {pendingInvitations.map((invitation) => (
                <div
                  className="flex min-w-0 items-center gap-2 rounded-xl bg-muted/30 p-2"
                  key={invitation._id}
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-background text-muted-foreground shadow-xs">
                    <HugeiconsIcon aria-hidden icon={UserIcon} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm">
                      {invitation.normalizedEmail}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {t("pending")}
                    </span>
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
          ) : (
            <p className="flex min-h-24 items-center justify-center text-sm text-muted-foreground">
              {t("empty")}
            </p>
          )}
        </section>
      </DialogContent>
    </Dialog>
  );
}
