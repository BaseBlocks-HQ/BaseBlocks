"use client";

import { useEditorSite } from "@/features/editor/editor-state";
import { getTeamDashboardPath } from "@/features/dashboard/routes";
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
  LoaderCircle,
  MoreHorizontal,
  PencilLine,
  Share2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { IconMagicWandSparkle, IconWindow2 } from "nucleo-glass";
import type { ReactNode } from "react";
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
  saveStatus?: SaveStatus;
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
  saveStatus = "idle",
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
              sitePublished={sitePublished}
              siteSlug={siteSlug}
              teamSlug={teamSlug}
            />
            <EditorHeaderActions
              canEdit={canEdit}
              engine={engine}
              isPreviewing={isPreviewing}
              onOpenShare={() => setShareDialogOpen(true)}
              onPublish={onPublish}
              onTogglePreview={onTogglePreview}
              onUnpublish={onUnpublish}
              saveStatus={saveStatus}
              siteId={siteId}
              sitePublished={sitePublished}
              siteSlug={siteSlug}
              teamSlug={teamSlug}
            />
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

function EditorHeaderIdentity({
  siteId,
  siteLogoUrl,
  siteName,
  sitePublished,
  siteSlug,
  teamSlug,
}: {
  siteId: string;
  siteLogoUrl?: string;
  siteName: string;
  sitePublished: boolean;
  siteSlug: string;
  teamSlug: string;
}) {
  const t = useTranslations("editor.header");

  return (
    <div className="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-2">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button asChild size="icon-sm" variant="ghost">
            <Link href={getTeamDashboardPath(teamSlug)}>
              <ArrowLeft />
              <span className="sr-only">{t("backToDashboard")}</span>
            </Link>
          </Button>
        </TooltipTrigger>
        <TooltipContent>{t("backToDashboard")}</TooltipContent>
      </Tooltip>

      <div className="min-w-0 w-8 @2xl/header:w-auto @2xl/header:max-w-52">
        <EditorSiteSwitcher
          currentSiteId={siteId}
          currentSiteLogoUrl={siteLogoUrl}
          currentSiteName={siteName}
          currentSitePublished={sitePublished}
          currentSiteSlug={siteSlug}
          teamSlug={teamSlug}
        />
      </div>
    </div>
  );
}

function EditorHeaderActions({
  canEdit,
  engine,
  isPreviewing,
  onOpenShare,
  onPublish,
  onTogglePreview,
  onUnpublish,
  saveStatus,
  siteId,
  sitePublished,
  siteSlug,
  teamSlug,
}: {
  canEdit: boolean;
  engine: "openeditor" | "legacy";
  isPreviewing: boolean;
  onOpenShare: () => void;
  onPublish: () => void;
  onTogglePreview?: () => void;
  onUnpublish?: () => void;
  saveStatus: SaveStatus;
  siteId: string;
  sitePublished: boolean;
  siteSlug: string;
  teamSlug: string;
}) {
  const t = useTranslations("editor.header");
  const searchParams = useSearchParams();
  const selectedPageId = searchParams.get("page");
  const targetEngine = engine === "legacy" ? "openeditor" : "legacy";
  const enginePath =
    targetEngine === "legacy"
      ? `/dashboard/${teamSlug}/sites/${siteId}/legacy`
      : `/dashboard/${teamSlug}/sites/${siteId}`;
  const engineHref = selectedPageId
    ? `${enginePath}?page=${selectedPageId}`
    : enginePath;
  const engineLabel =
    targetEngine === "legacy" ? t("legacyEditor") : t("newEditor");

  return (
    <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
      <HeaderAction tooltip={engineLabel}>
        <Button
          asChild
          className={headerActionClassName}
          size="sm"
          variant="ghost"
        >
          <Link href={engineHref}>
            {targetEngine === "legacy" ? (
              <PencilLine />
            ) : (
              <IconMagicWandSparkle />
            )}
            <HeaderActionLabel>{engineLabel}</HeaderActionLabel>
          </Link>
        </Button>
      </HeaderAction>

      {engine === "openeditor" && onTogglePreview ? (
        <HeaderAction tooltip={isPreviewing ? t("edit") : t("preview")}>
          <Button
            aria-pressed={isPreviewing}
            className={headerActionClassName}
            onClick={onTogglePreview}
            size="sm"
            variant="ghost"
          >
            {isPreviewing ? <PencilLine /> : <Eye />}
            <HeaderActionLabel>
              {isPreviewing ? t("edit") : t("preview")}
            </HeaderActionLabel>
          </Button>
        </HeaderAction>
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

function HeaderAction({
  children,
  tooltip,
}: {
  children: ReactNode;
  tooltip: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  );
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
  const tHeader = useTranslations("editor.header");
  const tooltip = sitePublished
    ? tHeader("viewPublishedTooltipWhenPublished")
    : tHeader("viewPublishedTooltipWhenDraft");

  return (
    <HeaderAction tooltip={tooltip}>
      <Button
        className={headerActionClassName}
        disabled={!sitePublished}
        onClick={() => openSite(teamSlug, siteSlug)}
        size="sm"
        variant="ghost"
      >
        <IconWindow2 />
        <HeaderActionLabel>{t("viewSite")}</HeaderActionLabel>
      </Button>
    </HeaderAction>
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
      <HeaderAction tooltip={tHeader("saving")}>
        <Button
          aria-live="polite"
          className={headerActionClassName}
          disabled
          size="sm"
        >
          <LoaderCircle className="animate-spin" />
          <HeaderActionLabel>{tHeader("saving")}</HeaderActionLabel>
        </Button>
      </HeaderAction>
    );
  }

  if (!sitePublished) {
    return (
      <HeaderAction tooltip={t("publish")}>
        <Button className={headerActionClassName} onClick={onPublish} size="sm">
          <Globe />
          <HeaderActionLabel>{t("publish")}</HeaderActionLabel>
        </Button>
      </HeaderAction>
    );
  }

  return (
    <DropdownMenu>
      <HeaderAction tooltip={tHeader("publishedStatus")}>
        <DropdownMenuTrigger asChild>
          <Button className={headerActionClassName} size="sm" variant="outline">
            <Check className="text-emerald-500" />
            <HeaderActionLabel>{tHeader("publishedStatus")}</HeaderActionLabel>
            <ChevronDown className="hidden @2xl/header:block" />
          </Button>
        </DropdownMenuTrigger>
      </HeaderAction>
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
      <HeaderAction tooltip={t("moreActions")}>
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
      </HeaderAction>
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
