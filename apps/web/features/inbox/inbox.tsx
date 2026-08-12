"use client";

import {
  DashboardPage,
  DashboardPageEmptyState,
  DashboardPageHeader,
  DashboardPageLoadingState,
} from "@/features/dashboard/layout/dashboard-page";
import { getTeamDashboardPath } from "@/features/dashboard/routes";
import { DeclineInvitationDialog } from "@/features/inbox/decline-invitation-dialog";
import { InboxList } from "@/features/inbox/inbox-list";
import {
  inboxReducer,
  initialInboxState,
  type InboxInvitation,
} from "@/features/inbox/model";
import { listInboxItems } from "@/features/inbox/sources";
import { useRouter } from "@/i18n/navigation";
import { authClient } from "@/lib/auth/client";
import { Badge } from "@baseblocks/ui/badge";
import { InboxIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useTranslations } from "next-intl";
import { useEffect, useEffectEvent, useReducer, useState } from "react";

const SIDEBAR_ICON_STROKE = 1.75;

function organizationLabel(invitation: InboxInvitation, invitedToOrg: string) {
  return invitation.organizationName || invitation.inviterEmail || invitedToOrg;
}

interface InboxProps {
  onboardingMode?: boolean;
}

export function Inbox({ onboardingMode = false }: InboxProps) {
  const t = useTranslations("inbox");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [declineTarget, setDeclineTarget] = useState<InboxInvitation | null>(
    null,
  );
  const [isDeclining, setIsDeclining] = useState(false);
  const [state, dispatch] = useReducer(inboxReducer, initialInboxState);
  const { items, isLoading, processingId, error } = state;
  const invitationCount = items.filter(
    (item) => item.kind === "invitation",
  ).length;

  const loadInbox = async () => {
    dispatch({ type: "LOAD_START" });
    try {
      dispatch({ type: "LOAD_SUCCESS", items: await listInboxItems() });
    } catch (err) {
      dispatch({
        type: "LOAD_ERROR",
        error: err instanceof Error ? err.message : t("loadFailed"),
      });
    }
  };

  const handleAccept = async (invitation: InboxInvitation) => {
    dispatch({ type: "PROCESS_START", id: invitation.id });
    try {
      const acceptResult = await authClient.organization.acceptInvitation({
        invitationId: invitation.id,
      });
      if (acceptResult.error) throw acceptResult.error;
      dispatch({ type: "REMOVE_ITEM", id: invitation.id });
      if (onboardingMode) {
        const organizationResult =
          await authClient.organization.getFullOrganization({
            query: { organizationId: invitation.organizationId },
          });
        if (organizationResult.error || !organizationResult.data) {
          throw organizationResult.error ?? new Error(t("acceptFailed"));
        }
        router.push(getTeamDashboardPath(organizationResult.data.slug));
      }
    } catch (err) {
      dispatch({
        type: "PROCESS_ERROR",
        error: err instanceof Error ? err.message : t("acceptFailed"),
      });
      void loadInbox();
    }
  };

  const runDecline = async (invitationId: string) => {
    dispatch({ type: "PROCESS_START", id: invitationId });
    try {
      const result = await authClient.organization.rejectInvitation({
        invitationId,
      });
      if (result.error) throw result.error;
      dispatch({ type: "REMOVE_ITEM", id: invitationId });
    } catch (err) {
      dispatch({
        type: "PROCESS_ERROR",
        error: err instanceof Error ? err.message : t("declineFailed"),
      });
      throw err;
    }
  };

  const confirmDecline = () => {
    if (!declineTarget) return;
    setIsDeclining(true);
    void runDecline(declineTarget.id)
      .then(() => setDeclineTarget(null))
      .catch(() => {})
      .finally(() => setIsDeclining(false));
  };

  const refreshInbox = useEffectEvent(loadInbox);

  useEffect(() => {
    void refreshInbox();
    const interval = setInterval(() => void refreshInbox(), 30000);
    return () => clearInterval(interval);
  }, []);

  const list = (
    <InboxList
      error={error}
      isLoading={isLoading}
      items={items}
      onboardingMode={onboardingMode}
      onAcceptInvitation={handleAccept}
      onDeclineInvitation={setDeclineTarget}
      processingId={processingId}
    />
  );
  const declineDescriptionOrg = declineTarget
    ? organizationLabel(declineTarget, t("invitedToOrg"))
    : "";
  const dialog = (
    <DeclineInvitationDialog
      open={!!declineTarget}
      onOpenChange={(next) => !next && setDeclineTarget(null)}
      title={t("declineTitle")}
      description={t("declineDescription", {
        organization: declineDescriptionOrg,
      })}
      cancelLabel={tCommon("cancel")}
      confirmLabel={isDeclining ? t("declining") : t("declineConfirm")}
      confirmDisabled={isDeclining}
      confirmLoading={isDeclining}
      onConfirm={confirmDecline}
    />
  );

  if (onboardingMode) {
    return (
      <div>
        <div className="mb-3 flex items-center gap-2">
          <HugeiconsIcon
            icon={InboxIcon}
            className="h-5 w-5 text-muted-foreground"
            strokeWidth={SIDEBAR_ICON_STROKE}
          />
          <h3 className="font-medium">{t("title")}</h3>
          {invitationCount > 0 ? (
            <Badge
              variant="destructive"
              className="flex h-5 min-w-5 animate-pulse items-center justify-center px-1 text-[10px] font-bold"
            >
              {invitationCount}
            </Badge>
          ) : null}
        </div>
        {list}
        {dialog}
      </div>
    );
  }

  return (
    <DashboardPage>
      <DashboardPageHeader title={t("title")} />
      {isLoading ? (
        <DashboardPageLoadingState />
      ) : items.length === 0 && !error ? (
        <DashboardPageEmptyState message={t("empty")} />
      ) : (
        list
      )}
      {dialog}
    </DashboardPage>
  );
}
