"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import {
  BubbleChatSpark01Icon,
  Globe02Icon,
  LinkSquare01Icon,
} from "@hugeicons/core-free-icons";
import {
  useEditorSite,
  useEditorWorkspace,
} from "@/features/editor/editor-state";
import { useTeamAccess } from "@/features/authentication/team-access";
import { AppHeaderPortal } from "@/features/app-shell/app-header";
import type { SiteManagementTarget } from "@/features/dashboard/sites/site-management-dialogs";
import { getSiteOpenUrl } from "@/features/published-sites/urls";
import type { Id } from "@baseblocks/backend";
import type { SaveStatus } from "@baseblocks/domain";
import { Badge } from "@baseblocks/ui/badge";
import { Button } from "@baseblocks/ui/button";
import { SidebarTrigger, useSidebar } from "@baseblocks/ui/sidebar";
import { Spinner } from "@baseblocks/ui/spinner";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import type { EditorDialogName } from "./editor-dialogs";
import { SiteHeaderMoreActions } from "./site-header-more-actions";

interface SiteHeaderContentProps {
  isPreviewing?: boolean;
  teamSlug: string;
  siteSlug: string;
  siteId: Id<"sites">;
  sitePublished: boolean;
  saveStatus?: SaveStatus;
  onOpenDialog: (
    dialog: EditorDialogName,
    returnFocusTo: HTMLElement | null,
  ) => void;
  onTogglePreview?: () => void;
  onUnpublish?: () => void;
  hasUnpublishedChanges: boolean;
  aiChatOpen: boolean;
  onToggleAiChat: () => void;
}

export function SiteHeaderContent({
  isPreviewing = false,
  teamSlug,
  siteSlug,
  siteId,
  sitePublished,
  saveStatus = "idle",
  onOpenDialog,
  onTogglePreview,
  onUnpublish,
  hasUnpublishedChanges,
  aiChatOpen,
  onToggleAiChat,
}: SiteHeaderContentProps) {
  const { canEdit } = useEditorSite();
  const { site } = useEditorWorkspace();
  const { analyticsEnabled, capabilities } = useTeamAccess();

  return (
    <AppHeaderPortal>
      <div className="relative flex h-full min-w-0 items-center gap-2 px-3 sm:px-4">
        <div className="flex min-w-0 flex-1 items-center">
          <SiteSidebarTrigger />
        </div>
        <SiteHeaderActions
          analyticsEnabled={analyticsEnabled}
          canEdit={canEdit}
          canManageSites={capabilities.canManageSites}
          isPreviewing={isPreviewing}
          onOpenDialog={onOpenDialog}
          onTogglePreview={onTogglePreview}
          onUnpublish={onUnpublish}
          saveStatus={saveStatus}
          sitePublished={sitePublished}
          hasUnpublishedChanges={hasUnpublishedChanges}
          siteId={siteId}
          siteSlug={siteSlug}
          teamSlug={teamSlug}
          site={site}
          aiChatOpen={aiChatOpen}
          onToggleAiChat={onToggleAiChat}
        />
      </div>
    </AppHeaderPortal>
  );
}

function SiteSidebarTrigger() {
  const t = useTranslations("navigation");
  const { isMobile, openMobile, state } = useSidebar();
  const visible = isMobile ? !openMobile : state === "collapsed";

  if (!visible) return null;

  return (
    <SidebarTrigger
      aria-label={t("openSiteSidebar")}
      className="size-8 shrink-0 rounded-lg"
      title={t("openSiteSidebar")}
    />
  );
}

function SiteHeaderActions({
  analyticsEnabled,
  canEdit,
  canManageSites,
  isPreviewing,
  onOpenDialog,
  onTogglePreview,
  onUnpublish,
  saveStatus,
  sitePublished,
  hasUnpublishedChanges,
  siteId,
  siteSlug,
  teamSlug,
  site,
  aiChatOpen,
  onToggleAiChat,
}: {
  analyticsEnabled: boolean;
  canEdit: boolean;
  canManageSites: boolean;
  isPreviewing: boolean;
  onOpenDialog: (
    dialog: EditorDialogName,
    returnFocusTo: HTMLElement | null,
  ) => void;
  onTogglePreview?: () => void;
  onUnpublish?: () => void;
  saveStatus: SaveStatus;
  sitePublished: boolean;
  hasUnpublishedChanges: boolean;
  siteId: string;
  siteSlug: string;
  teamSlug: string;
  site: SiteManagementTarget | null;
  aiChatOpen: boolean;
  onToggleAiChat: () => void;
}) {
  const t = useTranslations("editor.header");
  return (
    <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
      {canEdit ? (
        <>
          <ChatAction open={aiChatOpen} onToggle={onToggleAiChat} />
          <PublishChangesAction
            onPublish={(returnFocusTo) =>
              onOpenDialog("publish", returnFocusTo)
            }
            saveStatus={saveStatus}
            sitePublished={sitePublished}
            hasUnpublishedChanges={hasUnpublishedChanges}
          />
          <SiteHeaderMoreActions
            analyticsEnabled={analyticsEnabled}
            canManageSites={canManageSites}
            isPreviewing={isPreviewing}
            onOpenDialog={onOpenDialog}
            onTogglePreview={onTogglePreview}
            onUnpublish={onUnpublish}
            sitePublished={sitePublished}
            siteId={siteId}
            siteSlug={siteSlug}
            teamSlug={teamSlug}
            site={site}
          />
        </>
      ) : (
        <>
          <ViewSiteAction
            sitePublished={sitePublished}
            siteSlug={siteSlug}
            teamSlug={teamSlug}
          />
          <Badge className="ml-1 hidden xl:flex" variant="secondary">
            {t("viewOnlyBadge")}
          </Badge>
        </>
      )}
    </div>
  );
}

function ChatAction({
  open,
  onToggle,
}: {
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <Button
      aria-label={open ? "Close chat" : "Open chat"}
      aria-pressed={open}
      className={headerActionClassName}
      onClick={onToggle}
      size="sm"
      title={open ? "Close chat" : "Open chat"}
      variant={open ? "secondary" : "ghost"}
    >
      <HugeiconsIcon icon={BubbleChatSpark01Icon} />
      <HeaderActionLabel>Chat</HeaderActionLabel>
    </Button>
  );
}

const headerActionClassName =
  "size-8 gap-1.5 rounded-lg px-0 @2xl/header:h-8 @2xl/header:w-auto @2xl/header:px-3 [&_svg]:size-4";

function HeaderActionLabel({ children }: { children: ReactNode }) {
  return <span className="sr-only @2xl/header:not-sr-only">{children}</span>;
}

function ViewSiteAction({
  sitePublished,
  siteSlug,
  teamSlug,
}: {
  sitePublished: boolean;
  siteSlug: string;
  teamSlug: string;
}) {
  const t = useTranslations("editor");

  if (!sitePublished) return null;

  return (
    <Button
      className={headerActionClassName}
      onClick={() => openSite(teamSlug, siteSlug)}
      size="sm"
      variant="ghost"
    >
      <HugeiconsIcon icon={LinkSquare01Icon} />
      <HeaderActionLabel>{t("viewSite")}</HeaderActionLabel>
    </Button>
  );
}

function PublishChangesAction({
  onPublish,
  saveStatus,
  sitePublished,
  hasUnpublishedChanges,
}: {
  onPublish: (returnFocusTo: HTMLButtonElement) => void;
  saveStatus: SaveStatus;
  sitePublished: boolean;
  hasUnpublishedChanges: boolean;
}) {
  const tHeader = useTranslations("editor.header");
  const isSaving = saveStatus === "pending" || saveStatus === "saving";
  const shouldShow = sitePublished && (isSaving || hasUnpublishedChanges);

  if (!shouldShow) return null;

  return (
    <Button
      aria-live={isSaving ? "polite" : undefined}
      className={headerActionClassName}
      disabled={isSaving}
      onClick={(event) => onPublish(event.currentTarget)}
      size="sm"
      variant="ghost"
    >
      {isSaving ? <Spinner /> : <HugeiconsIcon icon={Globe02Icon} />}
      <HeaderActionLabel>
        {isSaving ? tHeader("saving") : tHeader("publishChanges")}
      </HeaderActionLabel>
    </Button>
  );
}

function openSite(teamSlug: string, siteSlug: string) {
  window.open(getSiteOpenUrl(teamSlug, siteSlug), "_blank");
}
