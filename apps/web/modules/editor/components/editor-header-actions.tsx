"use client";

import { getPreviewSiteUrl, getSiteUrl } from "@/lib/url";
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

interface EditorHeaderLeftSectionProps {
  canEdit: boolean;
  canUndo: (scope?: string) => boolean;
  canRedo: (scope?: string) => boolean;
  undo: (scope?: string) => void;
  redo: (scope?: string) => void;
  isUndoRedoExecuting: boolean;
  currentPageId: string | null;
  showControls: boolean;
  toggleControls: () => void;
  showHeaderPreview: boolean;
  onOpenHeaderPreview: () => void;
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
  canUndo,
  canRedo,
  undo,
  redo,
  isUndoRedoExecuting,
  currentPageId,
  showControls,
  toggleControls,
  showHeaderPreview,
  onOpenHeaderPreview,
}: EditorHeaderLeftSectionProps) {
  return (
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
      {canEdit && showHeaderPreview && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onOpenHeaderPreview}
            >
              <PanelTop className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Header Preview</TooltipContent>
        </Tooltip>
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
      {canEdit && (
        <EditorHeaderOverflowMenu
          sitePublished={sitePublished}
          teamSlug={teamSlug}
          siteSlug={siteSlug}
          onOpenShare={onOpenShare}
          onOpenHistory={onOpenHistory}
          t={t}
        />
      )}

      {canEdit && (
        <EditorHeaderSecondaryActions
          sitePublished={sitePublished}
          teamSlug={teamSlug}
          siteSlug={siteSlug}
          onOpenShare={onOpenShare}
          onOpenHistory={onOpenHistory}
          t={t}
        />
      )}

      <Separator orientation="vertical" className="mx-1.5 h-5" />

      {canEdit ? (
        <DeployCta
          hasUndeployedChanges={hasUndeployedChanges}
          sitePublished={sitePublished}
          onDeploy={onOpenDeploy}
          onPublish={onPublish}
          onUnpublish={onUnpublish}
          t={t}
        />
      ) : (
        sitePublished && (
          <>
            <Separator orientation="vertical" className="mx-1.5 h-5" />
            <Button
              variant="outline"
              size="sm"
              onClick={() => openPublishedSite(teamSlug, siteSlug)}
            >
              <Globe className="h-4 w-4" />
              {t("editor.viewLive")}
            </Button>
          </>
        )
      )}
    </div>
  );
}

function EditorHeaderOverflowMenu({
  sitePublished,
  teamSlug,
  siteSlug,
  onOpenShare,
  onOpenHistory,
  t,
}: {
  sitePublished: boolean;
  teamSlug: string;
  siteSlug: string;
  onOpenShare: () => void;
  onOpenHistory: () => void;
  t: (key: string) => string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" className="md:hidden">
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => openPreviewSite(teamSlug, siteSlug)}>
          <Eye />
          Preview
        </DropdownMenuItem>
        {sitePublished && (
          <DropdownMenuItem
            onClick={() => openPublishedSite(teamSlug, siteSlug)}
          >
            <ExternalLink />
            {t("editor.viewLive")}
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
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

function EditorHeaderSecondaryActions({
  sitePublished,
  teamSlug,
  siteSlug,
  onOpenShare,
  onOpenHistory,
  t,
}: {
  sitePublished: boolean;
  teamSlug: string;
  siteSlug: string;
  onOpenShare: () => void;
  onOpenHistory: () => void;
  t: (key: string) => string;
}) {
  return (
    <div className="hidden md:flex items-center gap-1">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5"
            onClick={() => openPreviewSite(teamSlug, siteSlug)}
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
              onClick={() => openPublishedSite(teamSlug, siteSlug)}
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
            onClick={onOpenShare}
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
              onClick={onOpenHistory}
            >
              <History className="h-4 w-4" />
              History
            </Button>
          </TooltipTrigger>
          <TooltipContent>Deployment History</TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}

function openPreviewSite(teamSlug: string, siteSlug: string) {
  window.open(getPreviewSiteUrl(teamSlug, siteSlug), "_blank");
}

function openPublishedSite(teamSlug: string, siteSlug: string) {
  window.open(getSiteUrl(teamSlug, siteSlug), "_blank");
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
                return;
              }
              undo();
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
                return;
              }
              redo();
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
