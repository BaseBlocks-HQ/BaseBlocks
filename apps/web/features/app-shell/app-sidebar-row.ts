export const APP_SIDEBAR_ICON_STROKE = 1.75;

export const appSidebarRowHeightClassName = "h-7";

export const appSidebarIconSlotClassName =
  "flex size-4 shrink-0 items-center justify-center";

export const appSidebarIconClassName =
  "size-3.5 shrink-0 text-sidebar-foreground/55";

export const appSidebarRowClassName = `flex ${appSidebarRowHeightClassName} w-full items-center justify-start gap-1.5 rounded-md border-0 px-2 text-xs font-normal text-sidebar-foreground/65 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring`;

export const appSidebarRowGapClassName = "gap-px";

export const appSidebarTreeLeadingInsetRem = 1.25;

export const appSidebarTreeDepthInsetRem = 0.75;

export function getAppSidebarTreePaddingInlineStart(depth: number): string {
  return `${appSidebarTreeLeadingInsetRem + depth * appSidebarTreeDepthInsetRem}rem`;
}
