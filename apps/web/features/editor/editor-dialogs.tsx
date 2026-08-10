"use client";

import type { Id } from "@baseblocks/backend";
import dynamic from "next/dynamic";
import type { DraftSummary } from "./release-dialogs";

const PublishDialog = dynamic(() =>
  import("./release-dialogs").then((module) => module.PublishDialog),
);
const HistoryDialog = dynamic(() =>
  import("./release-dialogs").then((module) => module.HistoryDialog),
);
const ShareDialog = dynamic(() =>
  import("./share-dialog").then((module) => module.ShareDialog),
);
const SiteSettingsDialog = dynamic(() =>
  import("./site-settings-dialog").then((module) => module.SiteSettingsDialog),
);

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
  if (!activeDialog) return null;
  const handleOpenChange = (open: boolean) => {
    if (open) return;
    const returnFocusTo = activeDialog.returnFocusTo;
    onActiveDialogChange(null);
    queueMicrotask(() => returnFocusTo?.focus());
  };

  switch (activeDialog.name) {
    case "publish":
      return (
        <PublishDialog
          draftSummary={draftSummary}
          onOpenChange={handleOpenChange}
          returnFocusTo={activeDialog.returnFocusTo}
          siteId={siteId}
        />
      );
    case "share":
      return (
        <ShareDialog
          onOpenChange={handleOpenChange}
          returnFocusTo={activeDialog.returnFocusTo}
          siteId={siteId}
          siteSlug={siteSlug}
          teamSlug={teamSlug}
        />
      );
    case "settings":
      return (
        <SiteSettingsDialog
          onOpenChange={handleOpenChange}
          returnFocusTo={activeDialog.returnFocusTo}
          siteId={siteId}
        />
      );
    case "history":
      return (
        <HistoryDialog
          onOpenChange={handleOpenChange}
          returnFocusTo={activeDialog.returnFocusTo}
          siteId={siteId}
        />
      );
  }
}
