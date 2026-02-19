"use client";

import { SearchBox } from "@/components/elements/sections/search/search-box";
import { ModeToggle } from "@/components/mode-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useCustomizationStyles } from "@/hooks";
import { cn, getSiteUrl } from "@/lib/utils";
import type { SiteCustomization } from "@/types/elements/customization";
import type { Id } from "@repo/backend";
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
import { DeployDialog } from "./deploy-dialog";
import { DeploymentHistoryPanel } from "./deployment-history-panel";
import { useEditorContext } from "./editor-context";
import { ShareDialog } from "./share-dialog";

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
    deploySite,
    undo,
    redo,
    canUndo,
    canRedo,
    isUndoRedoExecuting,
    currentPageId,
    showControls,
    toggleControls,
  } = useEditorContext();
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [deployDialogOpen, setDeployDialogOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [isHeaderPreview, setIsHeaderPreview] = useState(false);

  const showHeader = site.settings.showHeader !== false;
  const showLogo = site.settings.showLogo !== false;
  const showSiteName = site.settings.showSiteName !== false;
  const showHeaderSearch = site.settings.showHeaderSearch === true;
  const headerColor = site.settings.customization?.headerColor;
  const customizationStyles = useCustomizationStyles(
    site.settings.customization,
  );

  // Preview mode: show the site header as users will see it
  if (isHeaderPreview && showHeader) {
    return (
      <header
        className={cn(
          "border-b h-14 shrink-0 flex items-center px-4 z-40",
          !headerColor &&
            "bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
        )}
        style={
          headerColor
            ? {
                ...customizationStyles,
                backgroundColor: "var(--site-header-bg)",
                color: "var(--site-header-fg)",
              }
            : customizationStyles
        }
        {...(headerColor ? { "data-site-customized": "" } : {})}
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsHeaderPreview(false)}
          className={cn(
            "mr-3 gap-1.5",
            headerColor && "text-current hover:bg-current/10",
          )}
        >
          <PanelTop className="h-4 w-4" />
          Exit Preview
        </Button>

        <div
          className={cn(
            "h-5 w-px mr-3",
            headerColor ? "bg-current/20" : "bg-border",
          )}
        />

        <div className="flex items-center gap-2">
          {showLogo && <SiteLogo site={site} team={team} />}
          {showSiteName && <span className="font-semibold">{site.name}</span>}
        </div>

        <div className="flex items-center gap-3 ml-auto">
          {showHeaderSearch && (
            <SearchBox
              siteId={site._id}
              usePublicQuery={false}
              placeholder="Search..."
              maxResults={5}
              className="w-64"
              headerMode={!!headerColor}
            />
          )}
          <ModeToggle
            className={
              headerColor ? "text-current hover:bg-current/10" : undefined
            }
          />
        </div>
      </header>
    );
  }

  // Editor mode: normal editor controls
  return (
    <>
      <header className="border-b h-14 shrink-0 flex items-center justify-between px-4 bg-background z-40">
        {/* Left section */}
        <div className="flex items-center gap-2">
          <SidebarTrigger />
          {canEdit && (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    disabled={
                      isUndoRedoExecuting ||
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
                      isUndoRedoExecuting ||
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
          {/* Mobile-only: overflow dropdown for secondary actions */}
          {canEdit && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm" className="md:hidden">
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => {
                    const isLocalhost =
                      window.location.hostname === "localhost" ||
                      window.location.hostname === "127.0.0.1" ||
                      window.location.hostname.endsWith(".localhost");
                    const url = isLocalhost
                      ? `http://${teamSlug}.localhost:${window.location.port || "3000"}/${siteSlug}`
                      : getSiteUrl(teamSlug, siteSlug);
                    window.open(url, "_blank");
                  }}
                >
                  <Eye />
                  Preview
                </DropdownMenuItem>
                {sitePublished && (
                  <DropdownMenuItem asChild>
                    <a
                      href={getSiteUrl(teamSlug, siteSlug)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink />
                      {t("editor.viewLive")}
                    </a>
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
                    onClick={() => {
                      const isLocalhost =
                        window.location.hostname === "localhost" ||
                        window.location.hostname === "127.0.0.1" ||
                        window.location.hostname.endsWith(".localhost");
                      const url = isLocalhost
                        ? `http://${teamSlug}.localhost:${window.location.port || "3000"}/${siteSlug}`
                        : getSiteUrl(teamSlug, siteSlug);
                      window.open(url, "_blank");
                    }}
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
                      asChild
                    >
                      <a
                        href={getSiteUrl(teamSlug, siteSlug)}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="h-4 w-4" />
                        {t("editor.viewLive")}
                      </a>
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
            <>
              {hasUndeployedChanges ? (
                <Button
                  size="sm"
                  onClick={() => setDeployDialogOpen(true)}
                  className="gap-1.5 bg-amber-600 hover:bg-amber-700"
                >
                  <Rocket className="h-4 w-4" />
                  <span className="hidden md:inline">Deploy Changes</span>
                  <span className="md:hidden">Deploy</span>
                </Button>
              ) : sitePublished ? (
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
                      <DropdownMenuItem
                        onClick={onUnpublish}
                        variant="destructive"
                      >
                        <EyeOff />
                        {t("editor.unpublish")}
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button size="sm" onClick={onPublish}>
                  <Globe className="h-4 w-4" />
                  {t("editor.publish")}
                </Button>
              )}
            </>
          )}

          {/* View-only: just show View Live if published */}
          {!canEdit && sitePublished && (
            <>
              <Separator orientation="vertical" className="mx-1.5 h-5" />
              <Button variant="outline" size="sm" asChild>
                <a
                  href={getSiteUrl(teamSlug, siteSlug)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Globe className="h-4 w-4" />
                  {t("editor.viewLive")}
                </a>
              </Button>
            </>
          )}
        </div>
      </header>

      {/* Share Dialog */}
      <ShareDialog
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        siteId={siteId}
        teamSlug={teamSlug}
        siteSlug={siteSlug}
      />

      {/* Deploy Dialog */}
      <DeployDialog
        open={deployDialogOpen}
        onOpenChange={setDeployDialogOpen}
        onDeploy={deploySite}
      />

      {/* Deployment History Panel */}
      <DeploymentHistoryPanel
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        siteId={siteId}
      />
    </>
  );
}

function SiteLogo({
  site,
  team,
}: {
  site: { name: string; logoUrl?: string };
  team: { name: string; logoUrl?: string; settings: { primaryColor?: string } };
}) {
  if (site.logoUrl) {
    return (
      <img
        src={site.logoUrl}
        alt={site.name}
        className="h-8 w-8 rounded-lg object-contain"
      />
    );
  }

  if (team.logoUrl) {
    return (
      <img
        src={team.logoUrl}
        alt={team.name}
        className="h-8 w-8 rounded-lg object-contain"
      />
    );
  }

  return (
    <div
      className="flex h-8 w-8 items-center justify-center rounded-lg text-white font-bold"
      style={{
        backgroundColor: team.settings.primaryColor || "#0066FF",
      }}
    >
      {site.name[0]}
    </div>
  );
}
