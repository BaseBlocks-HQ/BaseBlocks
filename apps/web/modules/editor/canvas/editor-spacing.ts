import type { CSSProperties } from "react";

const EDITOR_SPACING_PX = 8;
const EDITOR_CONTROL_SIZE_PX = 24;

// Shared editor rhythm so layout stacks, block stacks, and handle spacing stay aligned.
export const editorLayoutStackClassName = "space-y-2";
export const editorBlockStackClassName = "flex flex-col gap-2";
export const editorSlotActionRowClassName = "flex gap-2 pt-2";
export const editorSlotActionButtonClassName =
  "flex flex-1 items-center justify-center gap-1 rounded border border-dashed border-transparent px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-muted-foreground/30 hover:text-foreground min-h-8";
export const editorControlRowClassName =
  "absolute top-0 left-0 flex items-center gap-0.5 pb-2";
export const editorControlZoneStyle: CSSProperties = {
  paddingTop: `${EDITOR_CONTROL_SIZE_PX + EDITOR_SPACING_PX}px`,
};
