"use client";

import type { Id } from "@baseblocks/backend";
import { useEffect, useRef } from "react";
import {
  type DraftSummary,
  HistoryDialog,
  PublishDialog,
} from "./release-dialogs";
import { ShareDialog } from "./share-dialog";
import { SiteSettingsDialog } from "./site-settings-dialog";

export type EditorDialogName = "history" | "publish" | "settings" | "share";

export interface EditorDialogState {
  name: EditorDialogName;
  returnFocusTo: HTMLElement | null;
}

interface EditorDialogsProps {
  activeDialog: EditorDialogState | null;
  draftSummary: DraftSummary;
  onActiveDialogChange: (dialog: EditorDialogState | null) => void;
  siteId: Id<"sites">;
  siteSlug: string;
  teamSlug: string;
}

export function EditorDialogs({
  activeDialog,
  draftSummary,
  onActiveDialogChange,
  siteId,
  siteSlug,
  teamSlug,
}: EditorDialogsProps) {
  const returnFocusRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (activeDialog?.returnFocusTo) {
      returnFocusRef.current = activeDialog.returnFocusTo;
    }
  }, [activeDialog]);

  const handleOpenChange = (open: boolean) => {
    if (!open) onActiveDialogChange(null);
  };
  const returnFocusTo = activeDialog?.returnFocusTo ?? returnFocusRef.current;

  return (
    <>
      <PublishDialog
        draftSummary={draftSummary}
        open={activeDialog?.name === "publish"}
        onOpenChange={handleOpenChange}
        returnFocusTo={returnFocusTo}
        siteId={siteId}
      />
      <ShareDialog
        open={activeDialog?.name === "share"}
        onOpenChange={handleOpenChange}
        returnFocusTo={returnFocusTo}
        siteId={siteId}
        siteSlug={siteSlug}
        teamSlug={teamSlug}
      />
      <SiteSettingsDialog
        open={activeDialog?.name === "settings"}
        onOpenChange={handleOpenChange}
        returnFocusTo={returnFocusTo}
        siteId={siteId}
      />
      <HistoryDialog
        open={activeDialog?.name === "history"}
        onOpenChange={handleOpenChange}
        returnFocusTo={returnFocusTo}
        siteId={siteId}
      />
    </>
  );
}
