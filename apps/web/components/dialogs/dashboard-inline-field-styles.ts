/**
 * Borderless fields for dashboard shell dialogs (create site, page title/slug, etc.).
 * Visually reads as inline text while staying accessible inputs.
 */
export const dashboardDialogPrimaryFieldLabelClassName =
  "mb-0.5 block text-xs font-medium tracking-wide text-sidebar-foreground/55";

export const dashboardDialogSecondaryFieldLabelClassName =
  "mb-0.5 block text-[11px] font-medium tracking-wide text-sidebar-foreground/45";

export const dashboardDialogPrimaryInlineInputClassName =
  "h-auto border-0 bg-transparent px-0 py-0.5 text-[1.4rem] font-semibold leading-tight tracking-tight text-sidebar-foreground shadow-none placeholder:text-sidebar-foreground/40 focus-visible:ring-0 md:!text-[1.4rem] dark:bg-transparent";

export const dashboardDialogSecondaryInlineInputClassName =
  "h-auto border-0 bg-transparent px-0 py-0.5 text-[0.95rem] leading-snug text-sidebar-foreground/80 shadow-none placeholder:text-sidebar-foreground/35 focus-visible:ring-0 md:!text-[0.95rem] dark:bg-transparent";

export const dashboardDialogFormErrorClassName =
  "rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive";
