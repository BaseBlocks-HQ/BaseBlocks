"use client";

import { BlurStack } from "@baseblocks/ui/blur-stack";
import { Link } from "@/i18n/navigation";
import { getTeamDashboardPath } from "@/features/dashboard/routes";
import { getSiteOpenUrl, getSiteUrl } from "@/features/published-sites/urls";
import { cn } from "@baseblocks/ui/lib/utils";
import { useEditorSite } from "@/features/editor/editor-state";
import { api } from "@baseblocks/backend";
import type { Id } from "@baseblocks/backend";
import { Badge } from "@baseblocks/ui/badge";
import { Button } from "@baseblocks/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@baseblocks/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@baseblocks/ui/dialog";
import { Separator } from "@baseblocks/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@baseblocks/ui/tooltip";
import { useQuery } from "convex/react";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Eye,
  EyeOff,
  Globe,
  MoreHorizontal,
  PencilLine,
  Share2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { IconMagicWandSparkle, IconWindow2 } from "nucleo-glass";
import { useState } from "react";
import { EditorSiteSwitcher } from "./editor-site-switcher";
import { ShareDialog } from "./publishing/share-dialog";
import type {
  AccessCodeData,
  SharingSettings,
} from "./publishing/share-dialog";

interface EditorHeaderProps {
  engine?: "openeditor" | "legacy";
  isPreviewing?: boolean;
  inFlow?: boolean;
  teamSlug: string;
  siteSlug: string;
  siteId: Id<"sites">;
  sitePublished: boolean;
  siteName: string;
  siteLogoUrl?: string;
  onPublish: () => void;
  onTogglePreview?: () => void;
  onUnpublish?: () => void;
}

export function EditorHeader({
  engine = "openeditor",
  isPreviewing = false,
  inFlow = false,
  teamSlug,
  siteSlug,
  siteId,
  sitePublished,
  siteName,
  siteLogoUrl,
  onPublish,
  onTogglePreview,
  onUnpublish,
}: EditorHeaderProps) {
  const { canEdit } = useEditorSite();
  const [shareDialogOpen, setShareDialogOpen] = useState(false);

  const { siteUrl, settings, accessCode } = useEditorHeaderData({
    shareOpen: shareDialogOpen,
    siteId,
    teamSlug,
    siteSlug,
  });

  return (
    <>
      <header
        className={cn(
          "z-40 [--bb-header-height:3.5rem]",
          inFlow ? "relative" : "absolute inset-x-0 top-0",
        )}
      >
        <div className="relative isolate">
          <BlurStack className="inset-x-0 top-0 h-full" direction="down" />
          <div className="absolute inset-0 bg-linear-to-b from-background/78 via-background/42 to-background/8 dark:from-background/86 dark:via-background/52 dark:to-background/12" />
          <div className="relative flex h-14 items-center justify-between px-4">
            <div className="relative flex w-full items-center justify-between gap-4">
              <EditorHeaderLeftSection
                canEdit={canEdit}
                currentSiteId={siteId}
                engine={engine}
                siteName={siteName}
                siteLogoUrl={siteLogoUrl}
                teamSlug={teamSlug}
              />
              <EditorHeaderRightSection
                engine={engine}
                isPreviewing={isPreviewing}
                canEdit={canEdit}
                siteId={siteId}
                sitePublished={sitePublished}
                teamSlug={teamSlug}
                siteSlug={siteSlug}
                onPublish={onPublish}
                onTogglePreview={onTogglePreview}
                onUnpublish={onUnpublish}
                onOpenShare={() => setShareDialogOpen(true)}
              />
            </div>
          </div>
        </div>
      </header>

      <ShareDialog
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        siteId={siteId}
        teamSlug={teamSlug}
        siteSlug={siteSlug}
        siteUrl={siteUrl}
        settings={settings}
        accessCode={accessCode}
      />
    </>
  );
}

interface UseEditorHeaderDataParams {
  shareOpen: boolean;
  siteId: Id<"sites">;
  teamSlug: string;
  siteSlug: string;
}

function useEditorHeaderData({
  shareOpen,
  siteId,
  teamSlug,
  siteSlug,
}: UseEditorHeaderDataParams) {
  const sharingSettings = useQuery(
    api.sharing.getSettings,
    shareOpen ? { siteId } : "skip",
  );
  const rawAccessCode = useQuery(
    api.sharing.getAccessCode,
    shareOpen ? { siteId } : "skip",
  );
  const settings: SharingSettings | undefined = sharingSettings
    ? {
        visibility: sharingSettings.visibility,
        accessCodeRotationHours: sharingSettings.accessCodeRotationHours,
        accessCodeSessionDays: sharingSettings.accessCodeSessionDays,
      }
    : undefined;

  const accessCode: AccessCodeData | null | undefined =
    rawAccessCode === undefined
      ? undefined
      : rawAccessCode
        ? {
            code: rawAccessCode.code,
            expiresAt: rawAccessCode.expiresAt,
            isExpired: rawAccessCode.isExpired,
          }
        : null;

  return {
    siteUrl: getSiteUrl(teamSlug, siteSlug),
    settings,
    accessCode,
  };
}

function openSite(teamSlug: string, siteSlug: string) {
  window.open(getSiteOpenUrl(teamSlug, siteSlug), "_blank");
}

interface EditorHeaderLeftSectionProps {
  canEdit: boolean;
  currentSiteId: string;
  engine: "openeditor" | "legacy";
  siteName: string;
  siteLogoUrl?: string;
  teamSlug: string;
}

function EditorHeaderLeftSection({
  canEdit,
  currentSiteId,
  engine,
  siteName,
  siteLogoUrl,
  teamSlug,
}: EditorHeaderLeftSectionProps) {
  const t = useTranslations("editor.header");
  const searchParams = useSearchParams();
  const selectedPageId = searchParams.get("page");
  const legacyPath = `/dashboard/${teamSlug}/sites/${currentSiteId}/legacy`;
  const legacyHref = selectedPageId
    ? `${legacyPath}?page=${selectedPageId}`
    : legacyPath;
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
      {engine === "openeditor" ? (
        <NewEditorAnnouncement legacyHref={legacyHref} />
      ) : null}
      {!canEdit && (
        <Badge variant="secondary" className="gap-1">
          <Eye className="h-3 w-3" />
          {t("viewOnlyBadge")}
        </Badge>
      )}
    </div>
  );
}

function NewEditorAnnouncement({ legacyHref }: { legacyHref: string }) {
  const t = useTranslations("editor.header");
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          className="gap-1.5 rounded-full border-violet-500/20 bg-violet-500/8 text-violet-700 hover:bg-violet-500/14 hover:text-violet-800 dark:text-violet-300 dark:hover:text-violet-200"
          size="sm"
          variant="outline"
        >
          <IconMagicWandSparkle className="size-3.5" />
          <span className="max-sm:sr-only">{t("newEditor")}</span>
          <Badge
            className="h-4 rounded-full px-1.5 text-[9px] uppercase tracking-wide"
            variant="secondary"
          >
            {t("beta")}
          </Badge>
        </Button>
      </DialogTrigger>
      <DialogContent className="overflow-hidden rounded-[1.5rem] border-sidebar-border bg-sidebar p-0 text-sidebar-foreground shadow-2xl sm:max-w-md [&_[data-slot='dialog-close']]:right-4 [&_[data-slot='dialog-close']]:top-4">
        <div className="px-5 pt-5">
          <DialogHeader className="gap-2">
            <div className="flex items-center gap-2">
              <IconMagicWandSparkle className="size-5 shrink-0 text-violet-700 dark:text-violet-300" />
              <DialogTitle className="text-lg">
                {t("newEditorDialogTitle")}
              </DialogTitle>
              <Badge className="rounded-full text-[10px] uppercase tracking-wide">
                {t("beta")}
              </Badge>
            </div>
            <DialogDescription className="text-sm leading-relaxed text-sidebar-foreground/60">
              {t("newEditorDialogDescription")}
            </DialogDescription>
          </DialogHeader>
        </div>
        <div className="space-y-3 px-5 text-sm leading-relaxed text-sidebar-foreground/70">
          <p>{t("newEditorDialogBetaBody")}</p>
          <p>{t("newEditorDialogFallbackBody")}</p>
        </div>
        <DialogFooter className="px-5 pb-5 pt-1">
          <Button asChild className="rounded-full" variant="outline">
            <Link href={legacyHref}>{t("openLegacyEditor")}</Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface EditorHeaderRightSectionProps {
  engine: "openeditor" | "legacy";
  isPreviewing: boolean;
  canEdit: boolean;
  siteId: string;
  sitePublished: boolean;
  teamSlug: string;
  siteSlug: string;
  onPublish: () => void;
  onTogglePreview?: () => void;
  onUnpublish?: () => void;
  onOpenShare: () => void;
}

function EditorHeaderRightSection({
  engine,
  isPreviewing,
  canEdit,
  siteId,
  sitePublished,
  teamSlug,
  siteSlug,
  onPublish,
  onTogglePreview,
  onUnpublish,
  onOpenShare,
}: EditorHeaderRightSectionProps) {
  const t = useTranslations("editor.header");
  const searchParams = useSearchParams();
  const selectedPageId = searchParams.get("page");
  const enginePath =
    engine === "legacy"
      ? `/dashboard/${teamSlug}/sites/${siteId}`
      : `/dashboard/${teamSlug}/sites/${siteId}/legacy`;
  const engineHref = selectedPageId
    ? `${enginePath}?page=${selectedPageId}`
    : enginePath;
  return (
    <div className="flex items-center gap-1">
      <Link href={engineHref}>
        <Button size="sm" variant="ghost">
          {engine === "legacy" ? (
            <span className="flex items-center gap-1.5">
              {t("newEditor")}
              <Badge
                className="h-4 rounded-full px-1.5 text-[9px] uppercase tracking-wide"
                variant="secondary"
              >
                {t("beta")}
              </Badge>
            </span>
          ) : (
            t("legacyEditor")
          )}
        </Button>
      </Link>
      {engine === "openeditor" && onTogglePreview ? (
        <Button
          aria-pressed={isPreviewing}
          className="gap-1.5 max-sm:size-8 max-sm:px-0 sm:min-w-24"
          onClick={onTogglePreview}
          size="sm"
          variant="ghost"
        >
          {isPreviewing ? <PencilLine /> : <Eye />}
          <span className="max-sm:sr-only sm:not-sr-only">
            {isPreviewing ? t("edit") : t("preview")}
          </span>
        </Button>
      ) : null}
      {canEdit ? (
        <>
          {engine === "legacy" ? (
            <ViewSiteButton
              sitePublished={sitePublished}
              teamSlug={teamSlug}
              siteSlug={siteSlug}
            />
          ) : null}
          <Separator orientation="vertical" className="mx-1.5 h-5" />
          <DeployCta
            sitePublished={sitePublished}
            teamSlug={teamSlug}
            siteSlug={siteSlug}
            onPublish={onPublish}
            onUnpublish={onUnpublish}
          />
          <EditorHeaderMenuButton onOpenShare={onOpenShare} />
        </>
      ) : engine === "legacy" ? (
        <ViewSiteButton
          sitePublished={sitePublished}
          teamSlug={teamSlug}
          siteSlug={siteSlug}
        />
      ) : null}
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

function EditorHeaderMenuButton({ onOpenShare }: { onOpenShare: () => void }) {
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
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function DeployCta({
  sitePublished,
  teamSlug,
  siteSlug,
  onPublish,
  onUnpublish,
}: {
  sitePublished: boolean;
  teamSlug: string;
  siteSlug: string;
  onPublish: () => void;
  onUnpublish?: () => void;
}) {
  const t = useTranslations("editor");
  const tHeader = useTranslations("editor.header");
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
          <DropdownMenuItem onClick={() => openSite(teamSlug, siteSlug)}>
            <IconWindow2 />
            {tHeader("visitPublishedSite")}
          </DropdownMenuItem>
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
