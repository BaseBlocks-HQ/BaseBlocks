"use client";

import { useEditorSite } from "@/features/editor/editor-state";
import { useTeamAccess } from "@/features/authentication/team-access";
import {
  getTeamDashboardPath,
  getTeamSiteEditorPath,
} from "@/features/dashboard/routes";
import { getSiteOpenUrl, getSiteUrl } from "@/features/published-sites/urls";
import { Link } from "@/i18n/navigation";
import { api } from "@baseblocks/backend";
import type { Id } from "@baseblocks/backend";
import type { SaveStatus } from "@baseblocks/domain";
import { Badge } from "@baseblocks/ui/badge";
import { BlurStack } from "@baseblocks/ui/blur-stack";
import { Button } from "@baseblocks/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@baseblocks/ui/dropdown-menu";
import { cn } from "@baseblocks/ui/lib/utils";
import { Toggle } from "@baseblocks/ui/toggle";
import { useQuery } from "convex/react";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  EyeOff,
  Globe,
  LoaderCircle,
  MoreHorizontal,
  PencilLine,
  Share2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { IconEye, IconWindow2 } from "nucleo-glass";
import Image from "next/image";
import dynamic from "next/dynamic";
import type { ReactNode } from "react";
import { useState } from "react";
import type { SharingSettings } from "./share-dialog";

const ShareDialog = dynamic(() =>
  import("./share-dialog").then((module) => module.ShareDialog),
);

interface EditorHeaderProps {
  isPreviewing?: boolean;
  inFlow?: boolean;
  teamSlug: string;
  siteSlug: string;
  siteId: Id<"sites">;
  sitePublished: boolean;
  siteName: string;
  siteLogoUrl?: string;
  saveStatus?: SaveStatus;
  onPublish: () => void;
  onTogglePreview?: () => void;
  onUnpublish?: () => void;
}

export function EditorHeader({
  isPreviewing = false,
  inFlow = false,
  teamSlug,
  siteSlug,
  siteId,
  sitePublished,
  siteName,
  siteLogoUrl,
  saveStatus = "idle",
  onPublish,
  onTogglePreview,
  onUnpublish,
}: EditorHeaderProps) {
  const { canEdit } = useEditorSite();
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const { siteUrl, settings } = useEditorHeaderData({
    shareOpen: shareDialogOpen,
    siteId,
    teamSlug,
    siteSlug,
  });

  return (
    <>
      <header
        className={cn(
          "@container/header z-40 [--bb-header-height:3.5rem]",
          inFlow ? "relative" : "absolute inset-x-0 top-0",
        )}
      >
        <div className="relative isolate">
          <BlurStack className="inset-x-0 top-0 h-full" direction="down" />
          <div className="absolute inset-0 bg-linear-to-b from-background/78 via-background/42 to-background/8 dark:from-background/86 dark:via-background/52 dark:to-background/12" />
          <div className="relative flex h-14 min-w-0 items-center gap-2 px-3 sm:px-4">
            <EditorHeaderIdentity
              siteId={siteId}
              siteLogoUrl={siteLogoUrl}
              siteName={siteName}
              teamSlug={teamSlug}
            />
            <EditorHeaderActions
              canEdit={canEdit}
              isPreviewing={isPreviewing}
              onOpenShare={() => setShareDialogOpen(true)}
              onPublish={onPublish}
              onTogglePreview={onTogglePreview}
              onUnpublish={onUnpublish}
              saveStatus={saveStatus}
              sitePublished={sitePublished}
              siteSlug={siteSlug}
              teamSlug={teamSlug}
            />
          </div>
        </div>
      </header>

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

function EditorHeaderIdentity({
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
  const t = useTranslations("editor.header");
  return (
    <div className="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-2">
      <Button asChild size="icon-sm" variant="ghost">
        <Link href={getTeamDashboardPath(teamSlug)}>
          <ArrowLeft />
          <span className="sr-only">{t("backToDashboard")}</span>
        </Link>
      </Button>

      <div className="flex h-8 min-w-0 w-8 items-center @2xl/header:w-auto @2xl/header:max-w-52">
        <EditorSiteSwitcher
          currentSiteId={siteId}
          currentSiteLogoUrl={siteLogoUrl}
          currentSiteName={siteName}
          teamSlug={teamSlug}
        />
      </div>
    </div>
  );
}

function SiteMark({ logoUrl, name }: { logoUrl?: string; name: string }) {
  if (logoUrl) {
    return (
      <Image
        alt={name}
        className="size-7 shrink-0 rounded-md object-contain"
        height={28}
        src={logoUrl}
        unoptimized
        width={28}
      />
    );
  }

  return (
    <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-medium text-muted-foreground">
      {name[0]?.toUpperCase() ?? "S"}
    </span>
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
    <>
      <SiteMark logoUrl={currentSiteLogoUrl} name={currentSiteName} />
      <span className="hidden min-w-0 truncate text-sm font-medium @2xl/header:block">
        {currentSiteName}
      </span>
      {hasOtherSites ? (
        <ChevronDown className="hidden size-3.5 shrink-0 text-muted-foreground @2xl/header:block" />
      ) : null}
    </>
  );

  if (!hasOtherSites) {
    return (
      <div className="flex h-8 min-w-0 items-center gap-2 px-0.5 @2xl/header:px-1.5">
        {identity}
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          className="h-8 min-w-0 max-w-full gap-2 rounded-lg px-0.5 text-left @2xl/header:w-auto @2xl/header:px-1.5"
          variant="ghost"
        >
          {identity}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-60" sideOffset={6}>
        {orderedSites.map((site) => {
          const content = (
            <>
              <SiteMark logoUrl={site.logoUrl} name={site.name} />
              <span className="min-w-0 flex-1 truncate">{site.name}</span>
              {site._id === currentSiteId ? (
                <Check className="size-3.5 text-muted-foreground" />
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

function EditorHeaderActions({
  canEdit,
  isPreviewing,
  onOpenShare,
  onPublish,
  onTogglePreview,
  onUnpublish,
  saveStatus,
  sitePublished,
  siteSlug,
  teamSlug,
}: {
  canEdit: boolean;
  isPreviewing: boolean;
  onOpenShare: () => void;
  onPublish: () => void;
  onTogglePreview?: () => void;
  onUnpublish?: () => void;
  saveStatus: SaveStatus;
  sitePublished: boolean;
  siteSlug: string;
  teamSlug: string;
}) {
  const t = useTranslations("editor.header");
  return (
    <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
      {onTogglePreview ? (
        <Toggle
          className={headerActionClassName}
          onPressedChange={() => onTogglePreview()}
          pressed={isPreviewing}
          size="sm"
        >
          {isPreviewing ? <PencilLine /> : <IconEye />}
          <HeaderActionLabel>
            {isPreviewing ? t("edit") : t("preview")}
          </HeaderActionLabel>
        </Toggle>
      ) : null}

      <ViewSiteAction
        sitePublished={sitePublished}
        siteSlug={siteSlug}
        teamSlug={teamSlug}
      />

      {canEdit ? (
        <>
          <DeployAction
            onPublish={onPublish}
            onUnpublish={onUnpublish}
            saveStatus={saveStatus}
            sitePublished={sitePublished}
          />
          <HeaderOverflow onOpenShare={onOpenShare} />
        </>
      ) : (
        <Badge className="ml-1 hidden xl:flex" variant="secondary">
          {t("viewOnlyBadge")}
        </Badge>
      )}
    </div>
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
      <IconWindow2 />
      <HeaderActionLabel>{t("viewSite")}</HeaderActionLabel>
    </Button>
  );
}

function DeployAction({
  onPublish,
  onUnpublish,
  saveStatus,
  sitePublished,
}: {
  onPublish: () => void;
  onUnpublish?: () => void;
  saveStatus: SaveStatus;
  sitePublished: boolean;
}) {
  const t = useTranslations("editor");
  const tHeader = useTranslations("editor.header");
  const isSaving = saveStatus === "pending" || saveStatus === "saving";

  if (isSaving) {
    return (
      <Button
        aria-live="polite"
        className={headerActionClassName}
        disabled
        size="sm"
      >
        <LoaderCircle className="animate-spin" />
        <HeaderActionLabel>{tHeader("saving")}</HeaderActionLabel>
      </Button>
    );
  }

  if (!sitePublished) {
    return (
      <Button className={headerActionClassName} onClick={onPublish} size="sm">
        <Globe />
        <HeaderActionLabel>{t("publish")}</HeaderActionLabel>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className={headerActionClassName} size="sm" variant="ghost">
          <Globe />
          <HeaderActionLabel>{tHeader("publishedStatus")}</HeaderActionLabel>
          <ChevronDown className="hidden @2xl/header:block" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {onUnpublish ? (
          <DropdownMenuItem onClick={onUnpublish} variant="destructive">
            <EyeOff />
            {t("unpublish")}
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function HeaderOverflow({ onOpenShare }: { onOpenShare: () => void }) {
  const t = useTranslations("editor.header");
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label={t("moreActions")}
          className="rounded-lg"
          size="icon-sm"
          variant="ghost"
        >
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onOpenShare}>
          <Share2 />
          {t("share")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function openSite(teamSlug: string, siteSlug: string) {
  window.open(getSiteOpenUrl(teamSlug, siteSlug), "_blank");
}

function useEditorHeaderData({
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
