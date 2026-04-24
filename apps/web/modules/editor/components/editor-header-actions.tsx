"use client";

import { Link } from "@/i18n/navigation";
import { getTeamDashboardPath } from "@/lib/routes/team-routes";
import { getSiteOpenUrl } from "@/lib/url";
import { EditorSiteSwitcher } from "@/modules/editor/components/editor-site-switcher";
import { Badge } from "@baseblocks/ui/badge";
import { Button } from "@baseblocks/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@baseblocks/ui/dropdown-menu";
import { Separator } from "@baseblocks/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@baseblocks/ui/tooltip";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Eye,
  EyeOff,
  Globe,
  History,
  MoreHorizontal,
  Share2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { IconRocket, IconWindow2 } from "nucleo-glass";

function openSite(teamSlug: string, siteSlug: string) {
  window.open(getSiteOpenUrl(teamSlug, siteSlug), "_blank");
}

interface EditorHeaderLeftSectionProps {
  canEdit: boolean;
  currentSiteId: string;
  siteName: string;
  siteLogoUrl?: string;
  teamSlug: string;
}

interface EditorHeaderRightSectionProps {
  canEdit: boolean;
  hasUndeployedChanges: boolean;
  sitePublished: boolean;
  teamSlug: string;
  siteSlug: string;
  onPublish: () => void;
  onUnpublish?: () => void;
  onOpenShare: () => void;
  onOpenDeploy: () => void;
  onOpenHistory: () => void;
}

export function EditorHeaderLeftSection({
  canEdit,
  currentSiteId,
  siteName,
  siteLogoUrl,
  teamSlug,
}: EditorHeaderLeftSectionProps) {
  const t = useTranslations("editor.header");
  return (
    <div className="flex min-w-0 items-center gap-2">
      <Link href={getTeamDashboardPath(teamSlug)}>
        <Button variant="ghost" size="icon-sm">
          <ArrowLeft className="h-4 w-4" />
          <span className="sr-only">{t("backToDashboard")}</span>
        </Button>
      </Link>
      <EditorSiteSwitcher
        currentSiteId={currentSiteId}
        currentSiteName={siteName}
        currentSiteLogoUrl={siteLogoUrl}
        teamSlug={teamSlug}
      />
      {!canEdit && (
        <Badge variant="secondary" className="gap-1">
          <Eye className="h-3 w-3" />
          {t("viewOnlyBadge")}
        </Badge>
      )}
    </div>
  );
}

export function EditorHeaderRightSection({
  canEdit,
  hasUndeployedChanges,
  sitePublished,
  teamSlug,
  siteSlug,
  onPublish,
  onUnpublish,
  onOpenShare,
  onOpenDeploy,
  onOpenHistory,
}: EditorHeaderRightSectionProps) {
  return (
    <div className="flex items-center gap-1">
      {canEdit ? (
        <>
          <EditorHeaderMenuButton
            sitePublished={sitePublished}
            onOpenShare={onOpenShare}
            onOpenHistory={onOpenHistory}
          />
          <ViewSiteButton
            sitePublished={sitePublished}
            teamSlug={teamSlug}
            siteSlug={siteSlug}
          />
          <Separator orientation="vertical" className="mx-1.5 h-5" />
          <DeployCta
            hasUndeployedChanges={hasUndeployedChanges}
            sitePublished={sitePublished}
            onDeploy={onOpenDeploy}
            onPublish={onPublish}
            onUnpublish={onUnpublish}
          />
        </>
      ) : (
        <ViewSiteButton
          sitePublished={sitePublished}
          teamSlug={teamSlug}
          siteSlug={siteSlug}
        />
      )}
    </div>
  );
}

function ViewSiteButton({
  sitePublished,
  teamSlug,
  siteSlug,
}: {
  sitePublished: boolean;
  teamSlug: string;
  siteSlug: string;
}) {
  const t = useTranslations("editor");
  const tHeader = useTranslations("editor.header");
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span>
          <Button
            variant="ghost"
            size="sm"
            aria-label={t("viewSite")}
            className="gap-1.5 max-sm:size-8 max-sm:px-0"
            disabled={!sitePublished}
            onClick={() => openSite(teamSlug, siteSlug)}
          >
            <IconWindow2 className="h-4 w-4 shrink-0" />
            <span className="max-sm:sr-only sm:not-sr-only">
              {t("viewSite")}
            </span>
          </Button>
        </span>
      </TooltipTrigger>
      <TooltipContent>
        {sitePublished
          ? tHeader("viewPublishedTooltipWhenPublished")
          : tHeader("viewPublishedTooltipWhenDraft")}
      </TooltipContent>
    </Tooltip>
  );
}

function EditorHeaderMenuButton({
  sitePublished,
  onOpenShare,
  onOpenHistory,
}: {
  sitePublished: boolean;
  onOpenShare: () => void;
  onOpenHistory: () => void;
}) {
  const t = useTranslations("editor.header");
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm">
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onOpenShare}>
          <Share2 />
          {t("share")}
        </DropdownMenuItem>
        {sitePublished ? (
          <DropdownMenuItem onClick={onOpenHistory}>
            <History />
            {t("deploymentHistory")}
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function DeployCta({
  hasUndeployedChanges,
  sitePublished,
  onDeploy,
  onPublish,
  onUnpublish,
}: {
  hasUndeployedChanges: boolean;
  sitePublished: boolean;
  onDeploy: () => void;
  onPublish: () => void;
  onUnpublish?: () => void;
}) {
  const t = useTranslations("editor");
  const tHeader = useTranslations("editor.header");
  if (hasUndeployedChanges) {
    return (
      <Button
        size="sm"
        onClick={onDeploy}
        className="gap-1.5 bg-amber-600 hover:bg-amber-700"
      >
        <IconRocket className="h-4 w-4 shrink-0" />
        <span className="hidden md:inline">{tHeader("deployChanges")}</span>
        <span className="md:hidden">{tHeader("deployShort")}</span>
      </Button>
    );
  }

  if (sitePublished) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5">
            <Check className="h-3.5 w-3.5 text-emerald-500" />
            {tHeader("publishedStatus")}
            <ChevronDown className="h-3 w-3 opacity-50" />
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

  return (
    <Button size="sm" onClick={onPublish}>
      <Globe className="h-4 w-4" />
      {t("publish")}
    </Button>
  );
}
