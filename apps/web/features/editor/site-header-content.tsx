"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowDown01Icon,
  BubbleChatSpark01Icon,
  FileClockIcon,
  Globe02Icon,
  LinkSquare01Icon,
  MoreHorizontalIcon,
  PencilEdit01Icon,
  SentIcon,
  CogIcon,
  Tick01Icon,
  ViewIcon,
  ViewOffIcon,
} from "@hugeicons/core-free-icons";
import { useEditorSite } from "@/features/editor/editor-state";
import { useTeamAccess } from "@/features/authentication/team-access";
import { AppHeaderPortal } from "@/features/app-shell/app-header";
import { getTeamSiteEditorPath } from "@/features/dashboard/routes";
import { getSiteOpenUrl } from "@/features/published-sites/urls";
import { Link } from "@/i18n/navigation";
import { api } from "@baseblocks/backend";
import type { Id } from "@baseblocks/backend";
import type { SaveStatus } from "@baseblocks/domain";
import { Badge } from "@baseblocks/ui/badge";
import { Button } from "@baseblocks/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@baseblocks/ui/dropdown-menu";
import { cn } from "@baseblocks/ui/lib/utils";
import { SidebarTrigger, useSidebar } from "@baseblocks/ui/sidebar";
import { Spinner } from "@baseblocks/ui/spinner";
import { useQuery } from "convex/react";
import { useTranslations } from "next-intl";
import { type ReactNode, useRef } from "react";
import type { EditorDialogName } from "./editor-dialogs";

interface SiteHeaderContentProps {
  isPreviewing?: boolean;
  teamSlug: string;
  siteSlug: string;
  siteId: Id<"sites">;
  sitePublished: boolean;
  siteName: string;
  siteLogoUrl?: string;
  saveStatus?: SaveStatus;
  onOpenDialog: (
    dialog: EditorDialogName,
    returnFocusTo: HTMLElement | null,
  ) => void;
  onTogglePreview?: () => void;
  onUnpublish?: () => void;
  hasUnpublishedChanges: boolean;
  aiChatOpen: boolean;
  editorAiEnabled: boolean;
  onToggleAiChat: () => void;
}

export function SiteHeaderContent({
  isPreviewing = false,
  teamSlug,
  siteSlug,
  siteId,
  sitePublished,
  siteName,
  siteLogoUrl,
  saveStatus = "idle",
  onOpenDialog,
  onTogglePreview,
  onUnpublish,
  hasUnpublishedChanges,
  aiChatOpen,
  editorAiEnabled,
  onToggleAiChat,
}: SiteHeaderContentProps) {
  const { canEdit } = useEditorSite();

  return (
    <AppHeaderPortal>
      <div className="relative flex h-full min-w-0 items-center gap-2 px-3 sm:px-4">
        <SiteHeaderIdentity
          siteId={siteId}
          siteLogoUrl={siteLogoUrl}
          siteName={siteName}
          teamSlug={teamSlug}
        />
        <SiteHeaderActions
          canEdit={canEdit}
          isPreviewing={isPreviewing}
          onOpenDialog={onOpenDialog}
          onTogglePreview={onTogglePreview}
          onUnpublish={onUnpublish}
          saveStatus={saveStatus}
          sitePublished={sitePublished}
          hasUnpublishedChanges={hasUnpublishedChanges}
          siteSlug={siteSlug}
          teamSlug={teamSlug}
          aiChatOpen={aiChatOpen}
          editorAiEnabled={editorAiEnabled}
          onToggleAiChat={onToggleAiChat}
        />
      </div>
    </AppHeaderPortal>
  );
}

function SiteHeaderIdentity({
  siteId,
  siteLogoUrl,
  siteName,
  teamSlug,
}: {
  siteId: string;
  siteLogoUrl?: string;
  siteName: string;
  teamSlug: string;
}) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-2">
      <SiteSidebarTrigger />
      <EditorSiteSwitcher
        currentSiteId={siteId}
        currentSiteLogoUrl={siteLogoUrl}
        currentSiteName={siteName}
        teamSlug={teamSlug}
      />
    </div>
  );
}

function SiteSidebarTrigger() {
  const { isMobile, openMobile, state } = useSidebar();
  const visible = isMobile ? !openMobile : state === "collapsed";

  if (!visible) return null;

  return (
    <SidebarTrigger
      aria-label="Open site sidebar"
      className="size-8 shrink-0 rounded-lg"
      title="Open site sidebar"
    />
  );
}

function SiteMark({
  logoUrl,
  name,
  placement = "menu",
}: {
  logoUrl?: string;
  name: string;
  placement?: "menu" | "switcher";
}) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted/60 ring-1 ring-black/10 ring-inset dark:ring-white/10",
        placement === "switcher" ? "size-7 @2xl/header:size-6" : "size-7",
      )}
    >
      {logoUrl ? (
        /* biome-ignore lint/performance/noImgElement: User-uploaded site marks are already served at their stored URL and should not be reprocessed in header chrome. */
        <img alt="" className="size-full object-contain" src={logoUrl} />
      ) : (
        <span aria-hidden className="text-xs font-medium text-muted-foreground">
          {name[0]?.toUpperCase() ?? "S"}
        </span>
      )}
    </span>
  );
}

function CurrentSiteIdentity({
  hasOtherSites,
  logoUrl,
  name,
}: {
  hasOtherSites: boolean;
  logoUrl?: string;
  name: string;
}) {
  return (
    <>
      <SiteMark logoUrl={logoUrl} name={name} placement="switcher" />
      <span className="sr-only min-w-0 flex-1 truncate text-sm font-medium @2xl/header:not-sr-only @2xl/header:block">
        {name}
      </span>
      {hasOtherSites ? (
        <span className="hidden shrink-0 items-center justify-center @2xl/header:flex">
          <HugeiconsIcon
            icon={ArrowDown01Icon}
            aria-hidden
            className="size-3.5 text-muted-foreground"
          />
        </span>
      ) : null}
    </>
  );
}

function EditorSiteSwitcher({
  currentSiteId,
  currentSiteLogoUrl,
  currentSiteName,
  teamSlug,
}: {
  currentSiteId: string;
  currentSiteLogoUrl?: string;
  currentSiteName: string;
  teamSlug: string;
}) {
  const { team } = useTeamAccess();
  const sites = useQuery(api.sites.listByTeam, {
    organizationId: team._id,
  });
  const orderedSites = sites
    ? [...sites].sort((left, right) => {
        if (left._id === currentSiteId) return -1;
        if (right._id === currentSiteId) return 1;
        return left.name.localeCompare(right.name);
      })
    : [];
  const hasOtherSites = orderedSites.some((site) => site._id !== currentSiteId);

  const identity = (
    <CurrentSiteIdentity
      hasOtherSites={hasOtherSites}
      logoUrl={currentSiteLogoUrl}
      name={currentSiteName}
    />
  );

  if (!hasOtherSites) {
    return (
      <div className="flex size-8 min-w-0 shrink-0 items-center gap-1.5 p-0.5 @2xl/header:w-auto @2xl/header:max-w-48 @2xl/header:shrink @2xl/header:px-1">
        {identity}
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label={`${currentSiteName}, switch site`}
          className="flex size-8 min-w-0 shrink-0 items-center gap-1.5 rounded-lg p-0.5 text-left outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-3 focus-visible:ring-ring/50 @2xl/header:w-auto @2xl/header:max-w-48 @2xl/header:shrink @2xl/header:px-1"
          type="button"
        >
          {identity}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-60" sideOffset={6}>
        {orderedSites.map((site) => {
          const content = (
            <>
              <SiteMark logoUrl={site.logoUrl} name={site.name} />
              <span className="min-w-0 flex-1 truncate">{site.name}</span>
              {site._id === currentSiteId ? (
                <HugeiconsIcon
                  icon={Tick01Icon}
                  className="size-3.5 text-muted-foreground"
                />
              ) : null}
            </>
          );

          if (site._id === currentSiteId) {
            return (
              <DropdownMenuItem
                key={site._id}
                className="gap-2"
                onSelect={(event) => event.preventDefault()}
              >
                {content}
              </DropdownMenuItem>
            );
          }

          return (
            <DropdownMenuItem asChild className="gap-2" key={site._id}>
              <Link href={getTeamSiteEditorPath(teamSlug, site._id)}>
                {content}
              </Link>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function SiteHeaderActions({
  canEdit,
  isPreviewing,
  onOpenDialog,
  onTogglePreview,
  onUnpublish,
  saveStatus,
  sitePublished,
  hasUnpublishedChanges,
  siteSlug,
  teamSlug,
  aiChatOpen,
  editorAiEnabled,
  onToggleAiChat,
}: {
  canEdit: boolean;
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
  siteSlug: string;
  teamSlug: string;
  aiChatOpen: boolean;
  editorAiEnabled: boolean;
  onToggleAiChat: () => void;
}) {
  const t = useTranslations("editor.header");
  return (
    <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
      {canEdit ? (
        <>
          {editorAiEnabled ? (
            <ChatAction open={aiChatOpen} onToggle={onToggleAiChat} />
          ) : null}
          <PublishChangesAction
            onPublish={(returnFocusTo) =>
              onOpenDialog("publish", returnFocusTo)
            }
            saveStatus={saveStatus}
            sitePublished={sitePublished}
            hasUnpublishedChanges={hasUnpublishedChanges}
          />
          <MoreActions
            isPreviewing={isPreviewing}
            onOpenDialog={onOpenDialog}
            onTogglePreview={onTogglePreview}
            onUnpublish={onUnpublish}
            sitePublished={sitePublished}
            siteSlug={siteSlug}
            teamSlug={teamSlug}
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
const headerIconActionClassName = "size-8 rounded-lg px-0 [&_svg]:size-4";

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

function MoreActions({
  isPreviewing,
  onOpenDialog,
  onTogglePreview,
  onUnpublish,
  sitePublished,
  siteSlug,
  teamSlug,
}: {
  isPreviewing: boolean;
  onOpenDialog: (
    dialog: EditorDialogName,
    returnFocusTo: HTMLElement | null,
  ) => void;
  onTogglePreview?: () => void;
  onUnpublish?: () => void;
  sitePublished: boolean;
  siteSlug: string;
  teamSlug: string;
}) {
  const t = useTranslations("editor");
  const tHeader = useTranslations("editor.header");
  const triggerRef = useRef<HTMLButtonElement>(null);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          ref={triggerRef}
          aria-label={tHeader("moreActions")}
          className={headerIconActionClassName}
          size="sm"
          title={tHeader("moreActions")}
          variant="ghost"
        >
          <HugeiconsIcon icon={MoreHorizontalIcon} className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52" sideOffset={6}>
        {sitePublished ? (
          <DropdownMenuItem onSelect={() => openSite(teamSlug, siteSlug)}>
            <HugeiconsIcon icon={LinkSquare01Icon} />
            {t("viewSite")}
          </DropdownMenuItem>
        ) : null}
        {onTogglePreview ? (
          <DropdownMenuItem onSelect={onTogglePreview}>
            {isPreviewing ? (
              <HugeiconsIcon icon={PencilEdit01Icon} />
            ) : (
              <HugeiconsIcon icon={ViewIcon} />
            )}
            {isPreviewing ? tHeader("edit") : tHeader("preview")}
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem
          onSelect={() => onOpenDialog("settings", triggerRef.current)}
        >
          <HugeiconsIcon icon={CogIcon} />
          Settings
        </DropdownMenuItem>
        {!sitePublished ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => onOpenDialog("publish", triggerRef.current)}
            >
              <HugeiconsIcon icon={Globe02Icon} />
              {tHeader("publishSite")}
            </DropdownMenuItem>
          </>
        ) : null}
        {sitePublished ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => onOpenDialog("share", triggerRef.current)}
            >
              <HugeiconsIcon icon={SentIcon} />
              {tHeader("share")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => onOpenDialog("history", triggerRef.current)}
            >
              <HugeiconsIcon icon={FileClockIcon} />
              {tHeader("deploymentHistory")}
            </DropdownMenuItem>
            {onUnpublish ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={onUnpublish} variant="destructive">
                  <HugeiconsIcon icon={ViewOffIcon} />
                  {t("unpublish")}
                </DropdownMenuItem>
              </>
            ) : null}
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function openSite(teamSlug: string, siteSlug: string) {
  window.open(getSiteOpenUrl(teamSlug, siteSlug), "_blank");
}
