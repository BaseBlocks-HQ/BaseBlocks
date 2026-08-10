"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { getSiteUrl } from "@/features/published-sites/urls";
import {
  Copy01Icon,
  GlobeIcon,
  Tick01Icon,
  ViewIcon,
  ViewOffIcon,
} from "@hugeicons/core-free-icons";
import { api } from "@baseblocks/backend";
import type { Id } from "@baseblocks/backend";
import { Button } from "@baseblocks/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@baseblocks/ui/dialog";
import { Label } from "@baseblocks/ui/label";
import { RadioGroup, RadioGroupItem } from "@baseblocks/ui/radio-group";
import { Spinner } from "@baseblocks/ui/spinner";
import { useMutation, useQuery } from "convex/react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Input } from "@baseblocks/ui/input";
import { workspaceApi } from "@/lib/convex/workspace-api";
import { useLocale } from "next-intl";

type Visibility = "private" | "public";

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pageId?: Id<"pages">;
  returnFocusTo?: HTMLElement | null;
  siteId: Id<"sites">;
  teamSlug: string;
  siteSlug: string;
}

function VisibilityOptionCard({
  description,
  icon,
  id,
  label,
  value,
}: {
  description: string;
  icon: React.ReactNode;
  id: string;
  label: string;
  value: Visibility;
}) {
  return (
    <div className="flex items-start space-x-3 rounded-xl border border-sidebar-border/60 bg-background/40 p-3 transition-colors hover:bg-sidebar-accent/30">
      <RadioGroupItem value={value} id={id} className="mt-0.5" />
      <div className="flex-1">
        <Label htmlFor={id} className="flex cursor-pointer items-center gap-2">
          {icon}
          {label}
        </Label>
        <p className="mt-1 text-sm text-sidebar-foreground/60">{description}</p>
      </div>
    </div>
  );
}

export function ShareDialog({
  open,
  onOpenChange,
  pageId,
  returnFocusTo,
  siteId,
  teamSlug,
  siteSlug,
}: ShareDialogProps) {
  const t = useTranslations("editor.share");
  const [copied, setCopied] = useState(false);
  const updateVisibilityMut = useMutation(api.sharing.updateVisibility);
  const settings = useQuery(
    api.sharing.getSettings,
    open ? { siteId } : "skip",
  );
  const siteUrl = getSiteUrl(teamSlug, siteSlug);
  const visibility = settings?.visibility;

  const handleVisibilityChange = async (value: Visibility) => {
    try {
      await updateVisibilityMut({
        siteId,
        visibility: value,
      });
      toast.success(t("toastVisibilityUpdated"));
    } catch {
      toast.error(t("toastVisibilityFailed"));
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(siteUrl);
    setCopied(true);
    toast.success(t("toastLinkCopied"));
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setCopied(false);
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className={`overflow-hidden rounded-[1.5rem] border-sidebar-border bg-sidebar p-0 text-sidebar-foreground shadow-2xl sm:max-w-[46rem] [&_[data-slot='dialog-close']]:top-4 [&_[data-slot='dialog-close']]:right-4 sm:max-w-lg`}
        returnFocusTo={returnFocusTo}
      >
        <DialogHeader className={"px-5 pt-4 pb-0"}>
          <DialogTitle className={"text-base font-semibold"}>
            {t("title")}
          </DialogTitle>
          <DialogDescription className={"text-sm text-sidebar-foreground/60"}>
            {t("description")}
          </DialogDescription>
        </DialogHeader>
        <div className={"px-5 pb-3"}>
          <div className="space-y-6 py-1">
            {visibility ? (
              <RadioGroup
                value={visibility}
                onValueChange={(value) =>
                  void handleVisibilityChange(value as Visibility)
                }
              >
                <VisibilityOptionCard
                  description={t("visibilityPublicDescription")}
                  icon={
                    <HugeiconsIcon
                      icon={GlobeIcon}
                      className="h-4 w-4 text-muted-foreground"
                    />
                  }
                  id="public"
                  label={t("visibilityPublicLabel")}
                  value="public"
                />
                <VisibilityOptionCard
                  description={t("visibilityPrivateDescription")}
                  icon={
                    <HugeiconsIcon
                      icon={ViewOffIcon}
                      className="h-4 w-4 text-muted-foreground"
                    />
                  }
                  id="private"
                  label={t("visibilityPrivateLabel")}
                  value="private"
                />
              </RadioGroup>
            ) : (
              <div className="flex min-h-32 items-center justify-center">
                <span className="sr-only">Loading sharing settings</span>
                <Spinner className="size-5 text-muted-foreground" />
              </div>
            )}
            {pageId ? <GuestAccessSection pageId={pageId} /> : null}
          </div>

          <DialogFooter className="flex-col gap-2 pt-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              className="h-8 flex-1 rounded-full border-sidebar-border/70 bg-transparent px-3.5 text-sm"
              disabled={!visibility}
              onClick={copyLink}
            >
              {copied ? (
                <>
                  <HugeiconsIcon icon={Tick01Icon} className="mr-2 h-4 w-4" />
                  {t("copied")}
                </>
              ) : (
                <>
                  <HugeiconsIcon icon={Copy01Icon} className="mr-2 h-4 w-4" />
                  {t("copyLink")}
                </>
              )}
            </Button>
            <Button
              type="button"
              className="h-8 flex-1 rounded-full px-4 text-sm"
              disabled={!visibility}
              onClick={() => window.open(siteUrl, "_blank")}
            >
              <HugeiconsIcon icon={ViewIcon} className="mr-2 h-4 w-4" />
              {t("viewSite")}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

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

function GuestAccessSection({ pageId }: { pageId: Id<"pages"> }) {
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
