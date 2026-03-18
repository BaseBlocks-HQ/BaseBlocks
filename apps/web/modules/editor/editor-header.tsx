"use client";

import { PublicHeaderBlur } from "@/components/public/public-header-blur";
import { useEditorSite } from "@/modules/shared/contexts/editor-context";
import type { Id } from "@baseblocks/backend";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { DeployDialog } from "./components/deploy-dialog";
import { DeploymentHistoryPanel } from "./components/deployment-history-panel";
import {
  EditorHeaderLeftSection,
  EditorHeaderRightSection,
} from "./components/editor-header-actions";
import { ShareDialog } from "./components/share-dialog";
import { useEditorHeaderData } from "./hooks/use-editor-header-data";

interface EditorHeaderProps {
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
  teamSlug,
  siteSlug,
  siteId,
  sitePublished,
  siteName,
  siteLogoUrl,
  onPublish,
  onUnpublish,
}: EditorHeaderProps) {
  const t = useTranslations();
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
    siteId,
    teamSlug,
    siteSlug,
    historyOpen,
  });

  return (
    <>
      <header className="relative z-40 h-14 shrink-0">
        <div className="relative isolate flex h-full items-center justify-between px-4">
          <PublicHeaderBlur />
          <div className="absolute inset-0 bg-linear-to-b from-background/78 via-background/42 to-background/8 dark:from-background/86 dark:via-background/52 dark:to-background/12" />
          <div className="relative flex w-full items-center justify-between gap-4">
            <EditorHeaderLeftSection
              canEdit={canEdit}
              siteName={siteName}
              siteLogoUrl={siteLogoUrl}
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
              t={t}
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
