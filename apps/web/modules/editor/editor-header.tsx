"use client";

import {
  useEditorSite,
  useEditorUi,
  useEditorUndo,
} from "@/modules/shared/contexts/editor-context";
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
  const { currentPageId, showControls, toggleControls } = useEditorUi();
  const { undo, redo, canUndo, canRedo, isUndoRedoExecuting } = useEditorUndo();
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
      <header className="border-b h-14 shrink-0 flex items-center justify-between px-4 bg-background z-40">
        <EditorHeaderLeftSection
          canEdit={canEdit}
          canUndo={canUndo}
          canRedo={canRedo}
          undo={undo}
          redo={redo}
          isUndoRedoExecuting={isUndoRedoExecuting}
          currentPageId={currentPageId}
          showControls={showControls}
          siteName={siteName}
          siteLogoUrl={siteLogoUrl}
          toggleControls={toggleControls}
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
