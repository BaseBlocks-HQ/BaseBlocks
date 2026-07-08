"use client";

import { BlurStack } from "@baseblocks/ui/blur-stack";
import { Link } from "@/i18n/navigation";
import { getTeamDashboardPath } from "@/lib/routes/team-routes";
import { getSiteOpenUrl, getSiteUrl } from "@/lib/url";
import { cn } from "@/lib/utils";
import { useEditorSite } from "@/modules/editor/state/editor-context";
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
import { Separator } from "@baseblocks/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@baseblocks/ui/tooltip";
import { useMutation, useQuery } from "convex/react";
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
import { useState } from "react";
import { DeployDialog } from "../publish/deploy-dialog";
import {
  DeploymentHistoryPanel,
  type DeploymentData,
} from "../publish/deployment-history-panel";
import { EditorSiteSwitcher } from "./editor-site-switcher";
import { ShareDialog } from "../publish/share-dialog";
import type { AccessCodeData, SharingSettings } from "../publish/share-dialog";
import { toast } from "sonner";

interface EditorHeaderProps {
  inFlow?: boolean;
  teamSlug: string;
  siteSlug: string;
  siteId: Id<"sites">;
  sitePublished: boolean;
  siteName: string;
  siteLogoUrl?: string;
  onPublish: () => void;
  onUnpublish?: () => void;
}

export function EditorHeader({
  inFlow = false,
  teamSlug,
  siteSlug,
  siteId,
  sitePublished,
  siteName,
  siteLogoUrl,
  onPublish,
  onUnpublish,
}: EditorHeaderProps) {
  const { canEdit, hasUndeployedChanges } = useEditorSite();
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [deployDialogOpen, setDeployDialogOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const {
    siteUrl,
    settings,
    accessCode,
    deployments,
    deploySite,
    rollbackDeployment,
  } = useEditorHeaderData({
    shareOpen: shareDialogOpen,
    siteId,
    teamSlug,
    siteSlug,
    historyOpen,
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
                siteName={siteName}
                siteLogoUrl={siteLogoUrl}
                teamSlug={teamSlug}
              />
              <EditorHeaderRightSection
                canEdit={canEdit}
                hasUndeployedChanges={hasUndeployedChanges}
                sitePublished={sitePublished}
                teamSlug={teamSlug}
                siteSlug={siteSlug}
                onPublish={onPublish}
                onUnpublish={onUnpublish}
                onOpenShare={() => setShareDialogOpen(true)}
                onOpenDeploy={() => setDeployDialogOpen(true)}
                onOpenHistory={() => setHistoryOpen(true)}
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

      <DeployDialog
        open={deployDialogOpen}
        onOpenChange={setDeployDialogOpen}
        onDeploy={deploySite}
      />

      <DeploymentHistoryPanel
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        siteId={siteId}
        deployments={deployments}
        onRollback={rollbackDeployment}
      />
    </>
  );
}

interface UseEditorHeaderDataParams {
  shareOpen: boolean;
  siteId: Id<"sites">;
  teamSlug: string;
  siteSlug: string;
  historyOpen: boolean;
}

function useEditorHeaderData({
  shareOpen,
  siteId,
  teamSlug,
  siteSlug,
  historyOpen,
}: UseEditorHeaderDataParams) {
  const deployMut = useMutation(api.deployments.mutations.deploy);
  const rollbackMut = useMutation(api.deployments.mutations.rollback);

  const sharingSettings = useQuery(
    api.sharing.queries.getSettings,
    shareOpen ? { siteId } : "skip",
  );
  const rawAccessCode = useQuery(
    api.sharing.queries.getAccessCode,
    shareOpen ? { siteId } : "skip",
  );
  const rawDeployments = useQuery(
    api.deployments.queries.list,
    historyOpen ? { siteId, limit: 50 } : "skip",
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

  const deployments: DeploymentData[] | undefined = rawDeployments?.map(
    (deployment) => ({
      id: deployment._id as string,
      version: deployment.version,
      status: deployment.status,
      notes: deployment.notes,
      deployedAt: deployment.deployedAt,
      summary: deployment.summary,
    }),
  );

  return {
    siteUrl: getSiteUrl(teamSlug, siteSlug),
    settings,
    accessCode,
    deployments,
    deploySite: async (notes?: string) => {
      try {
        await deployMut({ siteId, notes });
        toast.success("Changes deployed successfully");
      } catch (_error) {
        toast.error("Failed to deploy changes");
      }
    },
    rollbackDeployment: async (targetDeploymentId: string) => {
      await rollbackMut({
        siteId,
        targetDeploymentId: targetDeploymentId as Id<"deployments">,
      });
    },
  };
}

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

function EditorHeaderLeftSection({
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

function EditorHeaderRightSection({
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
