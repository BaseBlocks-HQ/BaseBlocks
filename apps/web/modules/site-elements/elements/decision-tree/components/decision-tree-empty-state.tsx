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
    <div className="flex flex-col items-center justify-center gap-3 px-4 py-12 text-center">
      <div className="flex size-10 items-center justify-center rounded-full bg-muted/50">
        <GitFork className="size-4 text-muted-foreground" />
      </div>
      <p className="max-w-[18rem] text-sm text-muted-foreground">
        This decision tree doesn&apos;t have any options yet
      </p>
    </div>
  );
}

export function DecisionTreeEndState({
  onStartOver,
}: {
  onStartOver: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-4 py-12 text-center">
      <div className="flex size-10 items-center justify-center rounded-full bg-primary/10">
        <CheckCircle2 className="size-4 text-primary" />
      </div>
      <p className="max-w-[18rem] text-sm text-muted-foreground">
        No more options available
      </p>
      <Button
        variant="outline"
        size="sm"
        onClick={onStartOver}
        className="mt-1 rounded-xl"
      >
        <RotateCcw className="size-3.5 mr-1.5" />
        Start over
      </Button>
    </div>
  );
}

export function DecisionTreeDetailPrompt() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
      <div className="flex size-9 items-center justify-center rounded-full bg-muted/50">
        <MousePointerClick className="size-4 text-muted-foreground" />
      </div>
      <p className="max-w-[16rem] text-sm text-muted-foreground">
        Choose from the list to view details
      </p>
    </div>
  );
}
