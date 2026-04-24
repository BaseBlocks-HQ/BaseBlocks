"use client";

import { cn } from "@/lib/utils";
import { useIsMobile } from "@baseblocks/ui/hooks/use-mobile";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@baseblocks/ui/resizable";
import { SplitViewPanel } from "./split-view-panel";

type SplitViewPlacement = "left" | "right" | "top" | "bottom";

interface SplitViewShellProps {
  className?: string;
  detail: React.ReactNode;
  detailCollapsedOnMobile?: boolean;
  detailDefaultSize?: number;
  detailExpanded?: boolean;
  detailPanelClassName?: string;
  detailPlacement?: SplitViewPlacement;
  detailSurfaceClassName?: string;
  insetClassName?: string;
  main?: React.ReactNode;
  mainDefaultSize?: number;
  mainPanelClassName?: string;
  minDetailSize?: number;
  minMainSize?: number;
}

function renderDetailPanel(
  detail: React.ReactNode,
  detailPanelClassName?: string,
  detailSurfaceClassName?: string,
) {
  return (
    <div className={cn("h-full min-h-0 min-w-0", detailPanelClassName)}>
      <SplitViewPanel className={detailSurfaceClassName}>
        {detail}
      </SplitViewPanel>
    </div>
  );
}

export function SplitViewShell({
  className,
  detail,
  detailCollapsedOnMobile = false,
  detailDefaultSize = 40,
  detailExpanded = false,
  detailPanelClassName,
  detailPlacement = "right",
  detailSurfaceClassName,
  insetClassName,
  main,
  mainDefaultSize = 60,
  mainPanelClassName,
  minDetailSize = 30,
  minMainSize = 30,
}: SplitViewShellProps) {
  const isMobile = useIsMobile();
  const detailFirst = detailPlacement === "left" || detailPlacement === "top";
  const orientation =
    detailPlacement === "top" || detailPlacement === "bottom"
      ? "vertical"
      : "horizontal";
  const showMainPanel = Boolean(main) && !detailExpanded;
  const collapseToDetailOnly =
    detailExpanded || (detailCollapsedOnMobile && isMobile);

  if (collapseToDetailOnly || !showMainPanel) {
    return (
      <div className={cn("h-full min-h-0 min-w-0", className)}>
        <div className={cn("h-full min-h-0 min-w-0", insetClassName)}>
          {renderDetailPanel(
            detail,
            detailPanelClassName,
            detailSurfaceClassName,
          )}
        </div>
      </div>
    );
  }

  const mainPanel = (
    <ResizablePanel defaultSize={mainDefaultSize} minSize={minMainSize}>
      <div
        className={cn(
          "h-full min-h-0 min-w-0 overflow-hidden",
          mainPanelClassName,
        )}
      >
        {main}
      </div>
    </ResizablePanel>
  );

  const detailPanel = (
    <ResizablePanel defaultSize={detailDefaultSize} minSize={minDetailSize}>
      {renderDetailPanel(detail, detailPanelClassName, detailSurfaceClassName)}
    </ResizablePanel>
  );

  return (
    <div className={cn("h-full min-h-0 min-w-0", className)}>
      <ResizablePanelGroup
        className={cn("h-full min-h-0 min-w-0", insetClassName)}
        orientation={orientation}
      >
        {detailFirst ? detailPanel : mainPanel}
        <ResizableHandle className="relative z-20 -mr-1 !w-0 !bg-transparent after:absolute after:inset-y-0 after:left-1/2 after:block after:w-3 after:-translate-x-1/2 after:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 data-[panel-group-direction=vertical]:-mb-1 data-[panel-group-direction=vertical]:!h-0 data-[panel-group-direction=vertical]:!w-full data-[panel-group-direction=vertical]:after:inset-x-0 data-[panel-group-direction=vertical]:after:top-1/2 data-[panel-group-direction=vertical]:after:h-3 data-[panel-group-direction=vertical]:after:w-full data-[panel-group-direction=vertical]:after:-translate-y-1/2 data-[panel-group-direction=vertical]:after:translate-x-0" />
        {detailFirst ? mainPanel : detailPanel}
      </ResizablePanelGroup>
    </div>
  );
}
