"use client";

import { Button } from "@baseblocks/ui/button";
import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";

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
    <div className="w-full min-w-0 border rounded-lg overflow-hidden">
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
      <div className="flex items-center gap-2 px-3 py-2 border-b bg-muted/30">
        <Button
          variant="ghost"
          size="icon"
          className="size-7 shrink-0"
          onClick={onBack}
        >
          <ChevronLeft className="size-4" />
        </Button>
        <span className="text-sm font-medium truncate">{title}</span>
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
      <div className="p-3">{children}</div>
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
      <div className="flex items-center justify-center py-8">
        <div className="w-full max-w-lg px-4">{children}</div>
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
      <div className="flex min-h-[300px]">
        <div className="w-[280px] shrink-0 border-r overflow-y-auto">
          {options}
        </div>
        <div className="flex-1 min-w-0 overflow-y-auto">{detail}</div>
      </div>
    </DecisionTreeShell>
  );
}
