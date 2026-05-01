"use client";

import { cn } from "@/lib/utils";
import { Button } from "@baseblocks/ui/button";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@baseblocks/ui/resizable";
import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";

const splitCard =
  "overflow-hidden rounded-md border border-border/60 bg-background/85 shadow-xs";

interface DecisionTreeShellProps {
  selector: ReactNode;
  navigationBar?: ReactNode;
  children: ReactNode;
}

function DecisionTreeShell({
  selector,
  navigationBar,
  children,
}: DecisionTreeShellProps) {
  return (
    <div className="not-prose w-full min-w-0 overflow-hidden rounded-lg border border-border/70 bg-transparent shadow-xs">
      {selector}
      {navigationBar}
      {children}
    </div>
  );
}

export function DecisionTreeMobileDetail({
  selector,
  title,
  onBack,
  children,
}: {
  selector: ReactNode;
  title: string;
  onBack: () => void;
  children: ReactNode;
}) {
  return (
    <DecisionTreeShell selector={selector}>
      <div className="flex items-center gap-1.5 px-2 py-1">
        <Button
          variant="ghost"
          size="icon-xs"
          className="shrink-0 text-muted-foreground hover:text-foreground"
          onClick={onBack}
        >
          <ChevronLeft className="size-4" />
        </Button>
        <span className="truncate text-sm font-medium">{title}</span>
      </div>
      {children}
    </DecisionTreeShell>
  );
}

export function DecisionTreeOptionsPanel({
  selector,
  navigationBar,
  children,
}: DecisionTreeShellProps) {
  return (
    <DecisionTreeShell selector={selector} navigationBar={navigationBar}>
      <div className="p-1.5">{children}</div>
    </DecisionTreeShell>
  );
}

export function DecisionTreeCenteredPanel({
  selector,
  children,
}: {
  selector: ReactNode;
  children: ReactNode;
}) {
  return (
    <DecisionTreeShell selector={selector}>
      <div className="flex items-center justify-center px-4 py-8 sm:px-6">
        <div className="w-full max-w-2xl">{children}</div>
      </div>
    </DecisionTreeShell>
  );
}

export function DecisionTreeSplitPanel({
  selector,
  navigationBar,
  options,
  detail,
}: {
  selector: ReactNode;
  navigationBar?: ReactNode;
  options: ReactNode;
  detail: ReactNode;
}) {
  return (
    <DecisionTreeShell selector={selector} navigationBar={navigationBar}>
      <div className="p-1.5">
        <div className="flex min-h-[340px] min-w-0 flex-col gap-1.5 lg:hidden">
          <div className={splitCard}>{options}</div>
          <div className={cn(splitCard, "min-h-0 min-w-0 flex-1")}>
            {detail}
          </div>
        </div>

        {/* Desktop: mirrors decision tree editor (tree-editor.tsx ResizablePanelGroup) */}
        <ResizablePanelGroup
          className="hidden min-h-[360px] min-w-0 lg:flex"
          orientation="horizontal"
        >
          <ResizablePanel defaultSize={40} minSize={25}>
            <div
              className={cn(splitCard, "flex h-full min-h-0 min-w-0 flex-col")}
            >
              {options}
            </div>
          </ResizablePanel>
          <ResizableHandle className="w-1 cursor-col-resize bg-transparent after:hidden focus-visible:ring-0" />
          <ResizablePanel defaultSize={60} minSize={35}>
            <div
              className={cn(
                splitCard,
                "h-full min-h-0 min-w-0 overflow-hidden",
              )}
            >
              {detail}
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </DecisionTreeShell>
  );
}
