"use client";

import type { UploadState } from "@/lib/storage";
import { cn } from "@/lib/utils";
import { Button } from "@baseblocks/ui/button";
import { Progress } from "@baseblocks/ui/progress";
import { AlertCircle, Check, Loader2, X } from "lucide-react";

function UploadProgress({
  className,
  filename,
  onDismiss,
  state,
}: {
  className?: string;
  filename: string;
  onDismiss?: () => void;
  state: UploadState;
}) {
  const { error, isUploading, progress } = state;
  const isComplete = !isUploading && !error && progress?.percentage === 100;

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-md border bg-background p-3",
        error && "border-destructive/50 bg-destructive/5",
        isComplete && "border-green-500/50 bg-green-500/5",
        className,
      )}
    >
      <div className="shrink-0">
        {isUploading ? (
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
        ) : null}
        {isComplete ? <Check className="h-4 w-4 text-green-500" /> : null}
        {error ? <AlertCircle className="h-4 w-4 text-destructive" /> : null}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{filename}</p>
        {isUploading && progress ? (
          <div className="mt-1.5">
            <Progress value={progress.percentage} className="h-1" />
            <p className="mt-1 text-xs text-muted-foreground">
              {progress.percentage}% uploaded
            </p>
          </div>
        ) : null}
        {error ? (
          <p className="mt-1 text-xs text-destructive">{error}</p>
        ) : null}
        {isComplete ? (
          <p className="mt-1 text-xs text-green-600">Upload complete</p>
        ) : null}
      </div>

      {!isUploading && onDismiss ? (
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0"
          onClick={onDismiss}
        >
          <X className="h-3 w-3" />
        </Button>
      ) : null}
    </div>
  );
}

export function UploadProgressList({
  className,
  onDismiss,
  uploads,
}: {
  className?: string;
  onDismiss?: (fileId: string) => void;
  uploads: Record<string, UploadState>;
}) {
  const entries = Object.entries(uploads);

  if (entries.length === 0) return null;

  return (
    <div className={cn("space-y-2", className)}>
      {entries.map(([fileId, state]) => (
        <UploadProgress
          key={fileId}
          filename={fileId.replace(/-\d+$/, "")}
          state={state}
          onDismiss={onDismiss ? () => onDismiss(fileId) : undefined}
        />
      ))}
    </div>
  );
}
