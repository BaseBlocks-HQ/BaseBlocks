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
import { cn, getSiteUrl } from "@/lib/utils";
import type { SiteCustomization } from "@/types/elements/customization";
import type { Id } from "@repo/backend";
import {
  Check,
  ChevronDown,
  Eye,
  EyeOff,
  ExternalLink,
  Globe,
  History,
  PanelTop,
  Rocket,
  Share2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useCustomizationStyles } from "@/hooks";
import { useEditorContext } from "./editor-context";
import { PreviewButton } from "./preview-button";
import { ShareDialog } from "./share-dialog";
import { DeployDialog } from "./deploy-dialog";
import { DeploymentHistoryPanel } from "./deployment-history-panel";

interface EditorHeaderProps {
  companySlug: string;
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
  company: {
    name: string;
    logoUrl?: string;
    settings: { primaryColor?: string };
  };
}

export function EditorHeader({
  companySlug,
  siteSlug,
  siteId,
  sitePublished,
  onPublish,
  onUnpublish,
  site,
  company,
}: EditorHeaderProps) {
  const t = useTranslations();
  const {
    canEdit,
    hasUndeployedChanges,
    deploySite,
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
  const customizationStyles = useCustomizationStyles(site.settings.customization);

  // Preview mode: show the site header as users will see it
  if (isHeaderPreview && showHeader) {
    return (
      <header
        className={cn(
          "border-b h-14 shrink-0 flex items-center px-4 z-40",
          !headerColor && "bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
        )}
        style={headerColor ? {
          ...customizationStyles,
          backgroundColor: "var(--site-header-bg)",
          color: "var(--site-header-fg)",
        } : customizationStyles}
        {...(headerColor ? { "data-site-customized": "" } : {})}
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsHeaderPreview(false)}
          className={cn("mr-3 gap-1.5", headerColor && "text-current hover:bg-current/10")}
        >
          <PanelTop className="h-4 w-4" />
          Exit Preview
        </Button>

        <div className={cn("h-5 w-px mr-3", headerColor ? "bg-current/20" : "bg-border")} />

        <div className="flex items-center gap-2">
          {showLogo && <SiteLogo site={site} company={company} />}
          {showSiteName && (
            <span className="font-semibold">{site.name}</span>
          )}
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
          <ModeToggle className={headerColor ? "text-current hover:bg-current/10" : undefined} />
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
          {!canEdit && (
            <Badge variant="secondary" className="gap-1">
              <Eye className="h-3 w-3" />
              View Only
            </Badge>
          )}
          {canEdit && showHeader && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsHeaderPreview(true)}
              className="gap-1.5"
            >
              <PanelTop className="h-4 w-4" />
              Header Preview
            </Button>
          )}
        </div>

        {/* Right section */}
        <div className="flex items-center gap-1">
          {/* Icon button group: Preview, View Live, Share, History */}
          <PreviewButton companySlug={companySlug} siteSlug={siteSlug} />

          {sitePublished && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon-sm" asChild>
                  <a
                    href={getSiteUrl(companySlug, siteSlug)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink />
                  </a>
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t("editor.viewLive")}</TooltipContent>
            </Tooltip>
          )}

          {canEdit && (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setShareDialogOpen(true)}
                  >
                    <Share2 />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Share</TooltipContent>
              </Tooltip>

              {sitePublished && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setHistoryOpen(true)}
                    >
                      <History />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Deployment History</TooltipContent>
                </Tooltip>
              )}
            </>
          )}

          {/* Separator between icon group and primary CTA */}
          {canEdit && (
            <Separator orientation="vertical" className="mx-1.5 h-5" />
          )}

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
                  Deploy Changes
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
                    <DropdownMenuItem asChild>
                      <a
                        href={getSiteUrl(companySlug, siteSlug)}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Globe />
                        {t("editor.viewLive")}
                      </a>
                    </DropdownMenuItem>
                    {onUnpublish && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={onUnpublish} variant="destructive">
                          <EyeOff />
                          {t("editor.unpublish")}
                        </DropdownMenuItem>
                      </>
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
                  href={getSiteUrl(companySlug, siteSlug)}
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
        companySlug={companySlug}
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
  company,
}: {
  site: { name: string; logoUrl?: string };
  company: { name: string; logoUrl?: string; settings: { primaryColor?: string } };
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

  if (company.logoUrl) {
    return (
      <img
        src={company.logoUrl}
        alt={company.name}
        className="h-8 w-8 rounded-lg object-contain"
      />
    );
  }

  return (
    <div
      className="flex h-8 w-8 items-center justify-center rounded-lg text-white font-bold"
      style={{
        backgroundColor: company.settings.primaryColor || "#0066FF",
      }}
    >
      {site.name[0]}
    </div>
  );
}
