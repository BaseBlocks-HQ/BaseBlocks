"use client";

import type {
  InboxActivity,
  InboxInvitation,
  InboxItem,
} from "@/features/inbox/model";
import { Avatar, AvatarFallback } from "@baseblocks/ui/avatar";
import { Badge } from "@baseblocks/ui/badge";
import { Button } from "@baseblocks/ui/button";
import { Empty, EmptyHeader, EmptyTitle } from "@baseblocks/ui/empty";
import { cn } from "@baseblocks/ui/lib/utils";
import { Spinner } from "@baseblocks/ui/spinner";
import { Cancel01Icon, Tick01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useTranslations } from "next-intl";

function organizationLabel(invitation: InboxInvitation, fallback: string) {
  return invitation.organizationName || invitation.inviterEmail || fallback;
}

function ActivityItem({ item }: { item: InboxActivity }) {
  return (
    <div className="rounded-xl bg-card p-4 shadow-[0_1px_2px_hsl(var(--foreground)/0.04)]">
      <p className="font-medium text-foreground">{item.title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
      <p className="mt-2 text-xs text-muted-foreground">
        {item.occurredAt.toLocaleDateString()}
      </p>
    </div>
  );
}

function InvitationItem({
  invitation,
  onAccept,
  onDecline,
  processing,
}: {
  invitation: InboxInvitation;
  onAccept: (invitation: InboxInvitation) => void;
  onDecline: (invitation: InboxInvitation) => void;
  processing: boolean;
}) {
  const t = useTranslations("inbox");
  const tTeam = useTranslations("team");
  const roleLabel =
    invitation.role === "admin"
      ? tTeam("roles.admin")
      : invitation.role === "owner"
        ? tTeam("roles.owner")
        : invitation.role === "member" || invitation.role === "editor"
          ? tTeam("roles.editor")
          : invitation.role === "viewer"
            ? tTeam("roles.viewer")
            : invitation.role;

  return (
    <div className="flex items-start gap-3 rounded-xl bg-card p-4 shadow-[0_1px_2px_hsl(var(--foreground)/0.04)]">
      <Avatar className="h-10 w-10 shrink-0">
        <AvatarFallback className="bg-muted text-muted-foreground">
          {invitation.inviterEmail?.[0]?.toUpperCase() || "?"}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1 space-y-2">
        <div>
          <p className="font-medium text-foreground">
            {organizationLabel(invitation, t("invitedToOrg"))}
          </p>
          <p className="text-sm text-muted-foreground">{t("invitedYou")}</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="secondary" className="text-xs">
            {roleLabel}
          </Badge>
          <span aria-hidden>·</span>
          <span>
            {t("expires", { date: invitation.expiresAt.toLocaleDateString() })}
          </span>
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          <Button
            size="sm"
            className="h-8 gap-2 rounded-full px-3.5 text-sm"
            onClick={() => onAccept(invitation)}
            disabled={processing}
          >
            {processing ? (
              <Spinner className="size-4" />
            ) : (
              <>
                <HugeiconsIcon icon={Tick01Icon} className="h-4 w-4 shrink-0" />
                {t("accept")}
              </>
            )}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-2 rounded-full bg-transparent px-3.5 text-sm"
            onClick={() => onDecline(invitation)}
            disabled={processing}
          >
            <HugeiconsIcon icon={Cancel01Icon} className="h-4 w-4 shrink-0" />
            {t("decline")}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function InboxList({
  error,
  isLoading,
  items,
  onboardingMode,
  onAcceptInvitation,
  onDeclineInvitation,
  processingId,
}: {
  error: string | null;
  isLoading: boolean;
  items: InboxItem[];
  onboardingMode: boolean;
  onAcceptInvitation: (invitation: InboxInvitation) => void;
  onDeclineInvitation: (invitation: InboxInvitation) => void;
  processingId: string | null;
}) {
  const t = useTranslations("inbox");

  return (
    <div className="space-y-3">
      {error ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {isLoading ? (
        <div className="flex min-h-24 items-center justify-center">
          <Spinner className="size-5 text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <Empty className="min-h-24 py-6">
          <EmptyHeader>
            <EmptyTitle className="font-normal text-muted-foreground">
              {t("empty")}
            </EmptyTitle>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className={cn(onboardingMode && "max-h-80 overflow-y-auto")}>
          <div className={cn("space-y-3", onboardingMode && "pr-3")}>
            {items.map((item) =>
              item.kind === "invitation" ? (
                <InvitationItem
                  invitation={item}
                  key={item.id}
                  onAccept={onAcceptInvitation}
                  onDecline={onDeclineInvitation}
                  processing={processingId === item.id}
                />
              ) : (
                <ActivityItem item={item} key={item.id} />
              ),
            )}
          </div>
        </div>
      )}
    </div>
  );
}
