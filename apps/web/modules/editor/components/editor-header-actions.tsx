"use client";

import { getSiteOpenUrl } from "@/lib/url";
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
  ExternalLink,
  Eye,
  EyeOff,
  Globe,
  History,
  MoreHorizontal,
  Rocket,
  Share2,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

function openSite(teamSlug: string, siteSlug: string) {
  window.open(getSiteOpenUrl(teamSlug, siteSlug), "_blank");
}

interface EditorHeaderLeftSectionProps {
  canEdit: boolean;
  siteName: string;
  siteLogoUrl?: string;
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
  t: (key: string) => string;
}

export function EditorHeaderLeftSection({
  canEdit,
  siteName,
  siteLogoUrl,
}: EditorHeaderLeftSectionProps) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <Link href="/dashboard">
        <Button variant="ghost" size="icon-sm">
          <ArrowLeft className="h-4 w-4" />
          <span className="sr-only">Back to dashboard</span>
        </Button>
      </Link>
      <div className="flex min-w-0 items-center gap-3">
        {siteLogoUrl ? (
          <Image
            src={siteLogoUrl}
            alt={siteName}
            className="h-8 w-8 rounded-lg object-contain"
            width={32}
            height={32}
            unoptimized
          />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground">
            {siteName[0]?.toUpperCase() ?? "S"}
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-medium leading-none">
            {siteName}
          </p>
        </div>
      </div>
      {!canEdit && (
        <Badge variant="secondary" className="gap-1">
          <Eye className="h-3 w-3" />
          View Only
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
  t,
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
            t={t}
          />
          <Separator orientation="vertical" className="mx-1.5 h-5" />
          <DeployCta
            hasUndeployedChanges={hasUndeployedChanges}
            sitePublished={sitePublished}
            onDeploy={onOpenDeploy}
            onPublish={onPublish}
            onUnpublish={onUnpublish}
            t={t}
          />
        </>
      ) : (
        <ViewSiteButton
          sitePublished={sitePublished}
          teamSlug={teamSlug}
          siteSlug={siteSlug}
          t={t}
        />
      )}
    </div>
  );
}

function ViewSiteButton({
  sitePublished,
  teamSlug,
  siteSlug,
  t,
}: {
  sitePublished: boolean;
  teamSlug: string;
  siteSlug: string;
  t: (key: string) => string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span>
          <Button
            variant="ghost"
            size="sm"
            aria-label={t("editor.viewSite")}
            className="gap-1.5 max-sm:size-8 max-sm:px-0"
            disabled={!sitePublished}
            onClick={() => openSite(teamSlug, siteSlug)}
          >
            <ExternalLink className="h-4 w-4" />
            <span className="max-sm:sr-only sm:not-sr-only">
              {t("editor.viewSite")}
            </span>
          </Button>
        </span>
      </TooltipTrigger>
      <TooltipContent>
        {sitePublished ? "Open published site" : "Publish your site first"}
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
          Share
        </DropdownMenuItem>
        {sitePublished && (
          <DropdownMenuItem onClick={onOpenHistory}>
            <History />
            Deployment History
          </DropdownMenuItem>
        )}
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
  t,
}: {
  hasUndeployedChanges: boolean;
  sitePublished: boolean;
  onDeploy: () => void;
  onPublish: () => void;
  onUnpublish?: () => void;
  t: (key: string) => string;
}) {
  if (hasUndeployedChanges) {
    return (
      <Button
        size="sm"
        onClick={onDeploy}
        className="gap-1.5 bg-amber-600 hover:bg-amber-700"
      >
        <Rocket className="h-4 w-4" />
        <span className="hidden md:inline">Deploy Changes</span>
        <span className="md:hidden">Deploy</span>
      </Button>
    );
  }

  if (sitePublished) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5">
            <Check className="h-3.5 w-3.5 text-emerald-500" />
            Published
            <ChevronDown className="h-3 w-3 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {onUnpublish && (
            <DropdownMenuItem onClick={onUnpublish} variant="destructive">
              <EyeOff />
              {t("editor.unpublish")}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <Button size="sm" onClick={onPublish}>
      <Globe className="h-4 w-4" />
      {t("editor.publish")}
    </Button>
  );
}
