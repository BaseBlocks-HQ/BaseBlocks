"use client";

import { getPreviewSiteUrl, getSiteUrl } from "@/lib/url";
import { useEditorContext } from "@/modules/shared/contexts/editor-context";
import type {
  AccessCodeData,
  DeploymentData,
  SharingSettings,
} from "@/modules/shared/types";
import { api } from "@baseblocks/backend";
import type { Id } from "@baseblocks/backend";
import type { SiteCustomization } from "@baseblocks/types/elements/customization";
import { Badge } from "@baseblocks/ui/badge";
import { Button } from "@baseblocks/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@baseblocks/ui/dropdown-menu";
import { Separator } from "@baseblocks/ui/separator";
import { SidebarTrigger } from "@baseblocks/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@baseblocks/ui/tooltip";
import { useMutation, useQuery } from "convex/react";
import {
  Check,
  ChevronDown,
  ExternalLink,
  Eye,
  EyeOff,
  Globe,
  GripVertical,
  History,
  MoreHorizontal,
  PanelTop,
  Redo2,
  Rocket,
  Share2,
  Undo2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { DeployDialog } from "./components/deploy-dialog";
import { DeploymentHistoryPanel } from "./components/deployment-history-panel";
import { HeaderPreview } from "./components/header-preview";
import { ShareDialog } from "./components/share-dialog";

interface EditorHeaderProps {
  teamSlug: string;
  siteSlug: string;
  siteId: Id<"sites">;
  sitePublished: boolean;
  onPublish: () => void;
  onUnpublish?: () => void;
  site: {
    _id: Id<"sites">;
    name: string;
    logoUrl?: string;
    settings: {
      showHeader?: boolean;
      showLogo?: boolean;
      showSiteName?: boolean;
      showHeaderSearch?: boolean;
      customization?: SiteCustomization;
    };
  };
  team: {
    name: string;
    logoUrl?: string;
    settings: { primaryColor?: string };
  };
}

function openSitePreview(teamSlug: string, siteSlug: string) {
  window.open(getPreviewSiteUrl(teamSlug, siteSlug), "_blank");
}

export function EditorHeader({
  teamSlug,
  siteSlug,
  siteId,
  sitePublished,
  onPublish,
  onUnpublish,
  site,
  team,
}: EditorHeaderProps) {
  const t = useTranslations();
  const {
    canEdit,
    hasUndeployedChanges,
    undo,
    redo,
    canUndo,
    canRedo,
    isUndoRedoExecuting,
    currentPageId,
    showControls,
    toggleControls,
  } = useEditorContext();

  const deployMut = useMutation(api.deployments.mutations.deploy);
  const rollbackMut = useMutation(api.deployments.mutations.rollback);

  const deploySite = async (notes?: string) => {
    try {
      await deployMut({ siteId, notes });
      toast.success("Changes deployed successfully");
    } catch (_error) {
      toast.error("Failed to deploy changes");
    }
  };

  const handleRollback = async (targetDeploymentId: string) => {
    await rollbackMut({
      siteId,
      targetDeploymentId: targetDeploymentId as Id<"deployments">,
    });
  };
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [deployDialogOpen, setDeployDialogOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [isHeaderPreview, setIsHeaderPreview] = useState(false);

  // Fetch sharing data for ShareDialog
  const sharingSettings = useQuery(api.sharing.queries.getSettings, { siteId });
  const rawAccessCode = useQuery(api.sharing.queries.getAccessCode, { siteId });

  // Fetch deployments for history panel (only when open)
  const rawDeployments = useQuery(
    api.deployments.queries.list,
    historyOpen ? { siteId, limit: 50 } : "skip",
  );

  // Map to editor-agnostic types
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
    (d) => ({
      id: d._id as string,
      version: d.version,
      status: d.status,
      notes: d.notes,
      deployedAt: d.deployedAt,
      summary: d.summary,
    }),
  );

  const showHeader = site.settings.showHeader !== false;

  // Preview mode: show the site header as users will see it
  if (isHeaderPreview && showHeader) {
    return (
      <HeaderPreview
        site={site}
        team={team}
        onExit={() => setIsHeaderPreview(false)}
      />
    );
  }

  // Editor mode
  return (
    <>
      <header className="border-b h-14 shrink-0 flex items-center justify-between px-4 bg-background z-40">
        {/* Left section */}
        <div className="flex items-center gap-2">
          <SidebarTrigger />
          {canEdit && (
            <UndoRedoControls
              canUndo={canUndo}
              canRedo={canRedo}
              undo={undo}
              redo={redo}
              isExecuting={isUndoRedoExecuting}
              currentPageId={currentPageId}
            />
          )}
          {!canEdit && (
            <Badge variant="secondary" className="gap-1">
              <Eye className="h-3 w-3" />
              View Only
            </Badge>
          )}
          {canEdit && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={showControls ? "secondary" : "ghost"}
                  size="icon-sm"
                  onClick={toggleControls}
                >
                  <GripVertical className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {showControls ? "Hide controls" : "Show controls"}
              </TooltipContent>
            </Tooltip>
          )}
          {canEdit && showHeader && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setIsHeaderPreview(true)}
                >
                  <PanelTop className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Header Preview</TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* Right section */}
        <div className="flex items-center gap-1">
          {/* Mobile-only: overflow dropdown */}
          {canEdit && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm" className="md:hidden">
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => openSitePreview(teamSlug, siteSlug)}
                >
                  <Eye />
                  Preview
                </DropdownMenuItem>
                {sitePublished && (
                  <DropdownMenuItem
                    onClick={() => openSitePreview(teamSlug, siteSlug)}
                  >
                    <ExternalLink />
                    {t("editor.viewLive")}
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setShareDialogOpen(true)}>
                  <Share2 />
                  Share
                </DropdownMenuItem>
                {sitePublished && (
                  <DropdownMenuItem onClick={() => setHistoryOpen(true)}>
                    <History />
                    Deployment History
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Desktop: inline secondary actions */}
          {canEdit && (
            <div className="hidden md:flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => openSitePreview(teamSlug, siteSlug)}
                  >
                    <Eye className="h-4 w-4" />
                    Preview
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Open site preview in new tab</TooltipContent>
              </Tooltip>
              {sitePublished && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => openSitePreview(teamSlug, siteSlug)}
                    >
                      <ExternalLink className="h-4 w-4" />
                      {t("editor.viewLive")}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>View published site</TooltipContent>
                </Tooltip>
              )}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => setShareDialogOpen(true)}
                  >
                    <Share2 className="h-4 w-4" />
                    Share
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Share site</TooltipContent>
              </Tooltip>
              {sitePublished && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => setHistoryOpen(true)}
                    >
                      <History className="h-4 w-4" />
                      History
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Deployment History</TooltipContent>
                </Tooltip>
              )}
            </div>
          )}

          <Separator orientation="vertical" className="mx-1.5 h-5" />

          {/* Primary CTA */}
          {canEdit && (
            <DeployCta
              hasUndeployedChanges={hasUndeployedChanges}
              sitePublished={sitePublished}
              onDeploy={() => setDeployDialogOpen(true)}
              onPublish={onPublish}
              onUnpublish={onUnpublish}
              t={t}
            />
          )}

          {/* View-only: just show View Live if published */}
          {!canEdit && sitePublished && (
            <>
              <Separator orientation="vertical" className="mx-1.5 h-5" />
              <Button
                variant="outline"
                size="sm"
                onClick={() => openSitePreview(teamSlug, siteSlug)}
              >
                <Globe className="h-4 w-4" />
                {t("editor.viewLive")}
              </Button>
            </>
          )}
        </div>
      </header>

      <ShareDialog
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        siteId={siteId}
        teamSlug={teamSlug}
        siteSlug={siteSlug}
        siteUrl={getSiteUrl(teamSlug, siteSlug)}
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
        onRollback={handleRollback}
      />
    </>
  );
}

function UndoRedoControls({
  canUndo,
  canRedo,
  undo,
  redo,
  isExecuting,
  currentPageId,
}: {
  canUndo: (scope?: string) => boolean;
  canRedo: (scope?: string) => boolean;
  undo: (scope?: string) => void;
  redo: (scope?: string) => void;
  isExecuting: boolean;
  currentPageId: string | null;
}) {
  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={
              isExecuting ||
              (!canUndo(currentPageId ?? undefined) && !canUndo())
            }
            onClick={() => {
              if (currentPageId && canUndo(currentPageId)) {
                undo(currentPageId);
              } else {
                undo();
              }
            }}
          >
            <Undo2 className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Undo (Cmd+Z)</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={
              isExecuting ||
              (!canRedo(currentPageId ?? undefined) && !canRedo())
            }
            onClick={() => {
              if (currentPageId && canRedo(currentPageId)) {
                redo(currentPageId);
              } else {
                redo();
              }
            }}
          >
            <Redo2 className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Redo (Cmd+Shift+Z)</TooltipContent>
      </Tooltip>
    </>
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
  t: ReturnType<typeof useTranslations>;
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
