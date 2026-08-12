export type SiteEditorAction =
  | "history"
  | "preview"
  | "publish"
  | "settings"
  | "share";

export const siteEditorActionEvent = "baseblocks:site-editor-action";
export const sitePreviewStateEvent = "baseblocks:site-preview-state";

export type SitePreviewState = {
  isPreviewing: boolean;
  siteId: string;
};

export function openActiveSiteEditorAction(action: SiteEditorAction) {
  window.dispatchEvent(
    new CustomEvent<SiteEditorAction>(siteEditorActionEvent, {
      detail: action,
    }),
  );
}
