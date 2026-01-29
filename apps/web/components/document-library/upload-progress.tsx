"use client";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { UploadState } from "@/lib/storage";
import { cn } from "@/lib/utils";
import { AlertCircle, Check, Loader2, X } from "lucide-react";

interface UploadProgressProps {
  filename: string;
  state: UploadState;
  onCancel?: () => void;
  onDismiss?: () => void;
  className?: string;
}

export function UploadProgress({
  filename,
  state,
  onCancel,
  onDismiss,
  className,
}: UploadProgressProps) {
  const { isUploading, progress, error } = state;
  const isComplete = !isUploading && !error && progress?.percentage === 100;

  return (
    <div
      className={cn(
        "flex items-center gap-3 p-3 rounded-md border bg-background",
        error && "border-destructive/50 bg-destructive/5",
        isComplete && "border-green-500/50 bg-green-500/5",
        className,
      )}
    >
      <div className="flex-shrink-0">
        {isUploading && (
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
        )}
        {isComplete && <Check className="h-4 w-4 text-green-500" />}
        {error && <AlertCircle className="h-4 w-4 text-destructive" />}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{filename}</p>
        {isUploading && progress && (
          <div className="mt-1.5">
            <Progress value={progress.percentage} className="h-1" />
            <p className="text-xs text-muted-foreground mt-1">
              {progress.percentage}% uploaded
            </p>
          </div>
        )}
        {error && <p className="text-xs text-destructive mt-1">{error}</p>}
        {isComplete && (
          <p className="text-xs text-green-600 mt-1">Upload complete</p>
        )}
      </div>

      {isUploading && onCancel && (
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 flex-shrink-0"
          onClick={onCancel}
        >
          <X className="h-3 w-3" />
        </Button>
      )}

      {!isUploading && onDismiss && (
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 flex-shrink-0"
          onClick={onDismiss}
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}

// Component to show multiple uploads
interface UploadProgressListProps {
  uploads: Record<string, UploadState>;
  onDismiss?: (fileId: string) => void;
  className?: string;
}

export function UploadProgressList({
  uploads,
  onDismiss,
  className,
}: UploadProgressListProps) {
  const entries = Object.entries(uploads);

  if (entries.length === 0) return null;

  return (
    <div className={cn("space-y-2", className)}>
      {entries.map(([fileId, state]) => {
        // Extract filename from fileId (format: "filename-timestamp")
        const filename = fileId.replace(/-\d+$/, "");
        return (
          <UploadProgress
            key={fileId}
            filename={filename}
            state={state}
            onDismiss={onDismiss ? () => onDismiss(fileId) : undefined}
          />
        );
      })}
    </div>
  );
}
