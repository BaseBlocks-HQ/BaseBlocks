"use client";

import { Button } from "@baseblocks/ui/button";
import {
  CheckCircle2,
  GitFork,
  MousePointerClick,
  RotateCcw,
} from "lucide-react";

export function DecisionTreeEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-10 px-4">
      <div className="size-12 rounded-full bg-muted/60 flex items-center justify-center">
        <GitFork className="size-6 text-muted-foreground" />
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-muted-foreground">
          No options configured
        </p>
        <p className="text-xs text-muted-foreground/70 mt-1">
          This decision tree doesn&apos;t have any options yet
        </p>
      </div>
    </div>
  );
}

export function DecisionTreeEndState({
  onStartOver,
}: {
  onStartOver: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-10 px-4">
      <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center">
        <CheckCircle2 className="size-5 text-primary" />
      </div>
      <div className="text-center">
        <p className="text-sm font-medium">End of path</p>
        <p className="text-xs text-muted-foreground mt-1">
          No more options available
        </p>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={onStartOver}
        className="mt-1"
      >
        <RotateCcw className="size-3.5 mr-1.5" />
        Start over
      </Button>
    </div>
  );
}

export function DecisionTreeDetailPrompt() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 px-6">
      <div className="size-10 rounded-full bg-muted/60 flex items-center justify-center">
        <MousePointerClick className="size-5 text-muted-foreground" />
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-muted-foreground">
          Select an option
        </p>
        <p className="text-xs text-muted-foreground/70 mt-1">
          Choose from the list to view details
        </p>
      </div>
    </div>
  );
}
