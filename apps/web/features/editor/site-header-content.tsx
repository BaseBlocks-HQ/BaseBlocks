"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowDown01Icon,
  AiChat02Icon,
  FileClockIcon,
  Globe02Icon,
  LinkSquare01Icon,
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
import { getSiteOpenUrl, getSiteUrl } from "@/features/published-sites/urls";
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
  DropdownMenuTrigger,
} from "@baseblocks/ui/dropdown-menu";
import { cn } from "@baseblocks/ui/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@baseblocks/ui/popover";
import { SidebarTrigger, useSidebar } from "@baseblocks/ui/sidebar";
import { Spinner } from "@baseblocks/ui/spinner";
import { useQuery } from "convex/react";
import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import type { ReactNode } from "react";
import { useState } from "react";
import type { SharingSettings } from "./share-dialog";

const ShareDialog = dynamic(() =>
  import("./share-dialog").then((module) => module.ShareDialog),
);
const SiteSettingsPanel = dynamic(() =>
  import("./site-settings-panel").then((module) => module.SiteSettingsPanel),
);

interface SiteHeaderContentProps {
  editorAiEnabled: boolean;
  isPreviewing?: boolean;
  teamSlug: string;
  siteSlug: string;
  siteId: Id<"sites">;
  sitePublished: boolean;
  siteName: string;
  siteLogoUrl?: string;
  saveStatus?: SaveStatus;
  onPublish: () => void;
  onOpenHistory: () => void;
  onTogglePreview?: () => void;
  onUnpublish?: () => void;
  hasUnpublishedChanges: boolean;
  aiChatOpen: boolean;
  onToggleAiChat: () => void;
}

export function SiteHeaderContent({
  editorAiEnabled,
  isPreviewing = false,
  teamSlug,
  siteSlug,
  siteId,
  sitePublished,
  siteName,
  siteLogoUrl,
  saveStatus = "idle",
  onPublish,
  onOpenHistory,
  onTogglePreview,
  onUnpublish,
  hasUnpublishedChanges,
  aiChatOpen,
  onToggleAiChat,
}: SiteHeaderContentProps) {
  const { canEdit } = useEditorSite();
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const { siteUrl, settings } = useSiteHeaderData({
    shareOpen: shareDialogOpen,
    siteId,
    teamSlug,
    siteSlug,
  });

  return (
    <>
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
            editorAiEnabled={editorAiEnabled}
            isPreviewing={isPreviewing}
            onOpenShare={() => setShareDialogOpen(true)}
            onOpenHistory={onOpenHistory}
            onPublish={onPublish}
            onTogglePreview={onTogglePreview}
            onUnpublish={onUnpublish}
            saveStatus={saveStatus}
            siteId={siteId}
            sitePublished={sitePublished}
            hasUnpublishedChanges={hasUnpublishedChanges}
            siteSlug={siteSlug}
            teamSlug={teamSlug}
            aiChatOpen={aiChatOpen}
            onToggleAiChat={onToggleAiChat}
          />
        </div>
      </AppHeaderPortal>

      {shareDialogOpen ? (
        <ShareDialog
          open
          onOpenChange={setShareDialogOpen}
          siteId={siteId}
          teamSlug={teamSlug}
          siteSlug={siteSlug}
          siteUrl={siteUrl}
          settings={settings}
        />
      ) : null}
    </>
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
  editorAiEnabled,
  isPreviewing,
  onOpenShare,
  onOpenHistory,
  onPublish,
  onTogglePreview,
  onUnpublish,
  saveStatus,
  siteId,
  sitePublished,
  hasUnpublishedChanges,
  siteSlug,
  teamSlug,
  aiChatOpen,
  onToggleAiChat,
}: {
  canEdit: boolean;
  editorAiEnabled: boolean;
  isPreviewing: boolean;
  onOpenShare: () => void;
  onOpenHistory: () => void;
  onPublish: () => void;
  onTogglePreview?: () => void;
  onUnpublish?: () => void;
  saveStatus: SaveStatus;
  siteId: Id<"sites">;
  sitePublished: boolean;
  hasUnpublishedChanges: boolean;
  siteSlug: string;
  teamSlug: string;
  aiChatOpen: boolean;
  onToggleAiChat: () => void;
}) {
  const t = useTranslations("editor.header");
  return (
    <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
      <ViewSiteAction
        sitePublished={sitePublished}
        siteSlug={siteSlug}
        teamSlug={teamSlug}
      />

      {canEdit ? (
        <>
          {editorAiEnabled ? (
            <EditorAiAction open={aiChatOpen} onToggle={onToggleAiChat} />
          ) : null}
          <SiteSettingsAction siteId={siteId} />
          <DeployAction
            isPreviewing={isPreviewing}
            onOpenShare={onOpenShare}
            onOpenHistory={onOpenHistory}
            onPublish={onPublish}
            onTogglePreview={onTogglePreview}
            onUnpublish={onUnpublish}
            saveStatus={saveStatus}
            sitePublished={sitePublished}
            hasUnpublishedChanges={hasUnpublishedChanges}
          />
        </>
      ) : (
        <Badge className="ml-1 hidden xl:flex" variant="secondary">
          {t("viewOnlyBadge")}
        </Badge>
      )}
    </div>
  );
}

function EditorAiAction({
  open,
  onToggle,
}: {
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <Button
      aria-label={open ? "Close editor AI" : "Open editor AI"}
      aria-pressed={open}
      className={headerActionClassName}
      onClick={onToggle}
      size="sm"
      title={open ? "Close editor AI" : "Open editor AI"}
      variant={open ? "secondary" : "ghost"}
    >
      <HugeiconsIcon icon={AiChat02Icon} />
      <HeaderActionLabel>AI</HeaderActionLabel>
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

function SiteSettingsAction({ siteId }: { siteId: Id<"sites"> }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          aria-label="Site settings"
          className={headerActionClassName}
          size="sm"
          title="Site settings"
          variant="ghost"
        >
          <HugeiconsIcon icon={CogIcon} />
          <HeaderActionLabel>Settings</HeaderActionLabel>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="max-h-[calc(100svh-4.5rem)] w-[min(24rem,calc(100vw-1rem))] overflow-y-auto rounded-xl p-0"
        sideOffset={8}
      >
        <SiteSettingsPanel siteId={siteId} />
      </PopoverContent>
    </Popover>
  );
}

function DeployAction({
  isPreviewing,
  onOpenShare,
  onOpenHistory,
  onPublish,
  onTogglePreview,
  onUnpublish,
  saveStatus,
  sitePublished,
  hasUnpublishedChanges,
}: {
  isPreviewing: boolean;
  onOpenShare: () => void;
  onOpenHistory: () => void;
  onPublish: () => void;
  onTogglePreview?: () => void;
  onUnpublish?: () => void;
  saveStatus: SaveStatus;
  sitePublished: boolean;
  hasUnpublishedChanges: boolean;
}) {
  const t = useTranslations("editor");
  const tHeader = useTranslations("editor.header");
  const isSaving = saveStatus === "pending" || saveStatus === "saving";
  const canPublish = !isSaving && (!sitePublished || hasUnpublishedChanges);
  const publishLabel = t("publish");

  return (
    <div className="flex h-8 shrink-0 overflow-hidden rounded-lg">
      <Button
        aria-live={isSaving ? "polite" : undefined}
        className="h-8 rounded-r-none px-2.5"
        disabled={!canPublish}
        onClick={onPublish}
        size="sm"
      >
        {isSaving ? <Spinner /> : <HugeiconsIcon icon={Globe02Icon} />}
        <HeaderActionLabel>
          {isSaving ? tHeader("saving") : publishLabel}
        </HeaderActionLabel>
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            aria-label="More publishing options"
            className="h-8 w-6 rounded-l-none border-l border-primary-foreground/20 px-0 focus-visible:z-10"
            size="sm"
          >
            <HugeiconsIcon icon={ArrowDown01Icon} className="size-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52" sideOffset={6}>
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
          {sitePublished ? (
            <>
              <DropdownMenuItem onSelect={onOpenShare}>
                <HugeiconsIcon icon={SentIcon} />
                {tHeader("share")}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={onOpenHistory}>
                <HugeiconsIcon icon={FileClockIcon} />
                {tHeader("deploymentHistory")}
              </DropdownMenuItem>
              {onUnpublish ? (
                <DropdownMenuItem onSelect={onUnpublish} variant="destructive">
                  <HugeiconsIcon icon={ViewOffIcon} />
                  {t("unpublish")}
                </DropdownMenuItem>
              ) : null}
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function openSite(teamSlug: string, siteSlug: string) {
  window.open(getSiteOpenUrl(teamSlug, siteSlug), "_blank");
}

function useSiteHeaderData({
  shareOpen,
  siteId,
  teamSlug,
  siteSlug,
}: {
  shareOpen: boolean;
  siteId: Id<"sites">;
  teamSlug: string;
  siteSlug: string;
}) {
  const sharingSettings = useQuery(
    api.sharing.getSettings,
    shareOpen ? { siteId } : "skip",
  );
  const settings: SharingSettings | undefined = sharingSettings
    ? { visibility: sharingSettings.visibility }
    : undefined;
  return {
    siteUrl: getSiteUrl(teamSlug, siteSlug),
    settings,
  };
}
