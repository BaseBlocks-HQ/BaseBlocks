"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { getSiteUrl } from "@/lib/utils";
import type { Id } from "@repo/backend";
import {
  Eye,
  EyeOff,
  Globe,
  Rocket,
  Share2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useEditorContext } from "./editor-context";
import { PreviewButton } from "./preview-button";
import { ShareDialog } from "./share-dialog";

interface EditorHeaderProps {
  companySlug: string;
  siteId: Id<"sites">;
  sitePublished: boolean;
  onPublish: () => void;
  onUnpublish?: () => void;
}

export function EditorHeader({
  companySlug,
  siteId,
  sitePublished,
  onPublish,
  onUnpublish,
}: EditorHeaderProps) {
  const t = useTranslations();
  const {
    canEdit,
    hasUndeployedChanges,
    markAsDeployed,
  } = useEditorContext();
  const [shareDialogOpen, setShareDialogOpen] = useState(false);

  const handleDeploy = () => {
    markAsDeployed();
  };

  return (
    <>
      <header className="border-b h-14 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <SidebarTrigger />
          {!canEdit && (
            <Badge variant="secondary" className="gap-1">
              <Eye className="h-3 w-3" />
              View Only
            </Badge>
          )}
          {hasUndeployedChanges && canEdit && (
            <Badge variant="outline" className="gap-1 text-amber-600 border-amber-300 bg-amber-50">
              Undeployed changes
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <PreviewButton companySlug={companySlug} />
          {canEdit && (
            <>
              {/* Share button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShareDialogOpen(true)}
              >
                <Share2 className="h-4 w-4 mr-1.5" />
                Share
              </Button>

              {/* Deploy button */}
              {hasUndeployedChanges ? (
                <Button size="sm" onClick={handleDeploy}>
                  <Rocket className="h-4 w-4 mr-1.5" />
                  Deploy
                </Button>
              ) : sitePublished ? (
                <>
                  {onUnpublish && (
                    <Button variant="outline" size="sm" onClick={onUnpublish}>
                      <EyeOff className="h-4 w-4 mr-1.5" />
                      {t("editor.unpublish")}
                    </Button>
                  )}
                  <Button variant="outline" size="sm" asChild>
                    <a
                      href={getSiteUrl(companySlug)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Globe className="h-4 w-4 mr-1.5" />
                      {t("editor.viewLive")}
                    </a>
                  </Button>
                </>
              ) : (
                <Button size="sm" onClick={onPublish}>
                  <Globe className="h-4 w-4 mr-1.5" />
                  {t("editor.publish")}
                </Button>
              )}
            </>
          )}
          {!canEdit && sitePublished && (
            <Button variant="outline" size="sm" asChild>
              <a
                href={getSiteUrl(companySlug)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Globe className="h-4 w-4 mr-1.5" />
                {t("editor.viewLive")}
              </a>
            </Button>
          )}
        </div>
      </header>

      {/* Share Dialog */}
      <ShareDialog
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        siteId={siteId}
        companySlug={companySlug}
      />
    </>
  );
}
