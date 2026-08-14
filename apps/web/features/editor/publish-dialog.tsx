"use client";

import { api, type Id } from "@baseblocks/backend";
import { Button } from "@baseblocks/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@baseblocks/ui/dialog";
import { Empty, EmptyHeader, EmptyTitle } from "@baseblocks/ui/empty";
import { cn } from "@baseblocks/ui/lib/utils";
import { Spinner } from "@baseblocks/ui/spinner";
import { Globe02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type DraftChange = {
  entityType: "site" | "page" | "library" | "folder" | "file";
  entityId: string;
  changeType: "added" | "updated" | "deleted" | "moved";
  label: string;
  details: string[];
};

export type DraftSummary = {
  draftRevision: number;
  hasUnpublishedChanges: boolean;
  nextReleaseNumber: number;
  liveRelease: {
    _id: Id<"siteReleases">;
    number: number;
  } | null;
};

export function PublishDialog({
  draftSummary,
  onOpenChange,
  returnFocusTo,
  siteId,
}: {
  draftSummary: DraftSummary;
  onOpenChange: (open: boolean) => void;
  returnFocusTo?: HTMLElement | null;
  siteId: Id<"sites">;
}) {
  const publish = useMutation(api.releases.publish);
  const changes = useQuery(api.releases.getDraftChanges, { siteId }) as
    | DraftChange[]
    | null
    | undefined;
  const [requesting, setRequesting] = useState(false);
  const [pendingPublication, setPendingPublication] = useState<{
    releaseId: Id<"siteReleases">;
    number: number;
  } | null>(null);
  const publicationStatus = useQuery(
    api.releases.getPublicationStatus,
    pendingPublication ? { releaseId: pendingPublication.releaseId } : "skip",
  );
  const publicationFinished =
    publicationStatus === null ||
    publicationStatus?.status === "complete" ||
    publicationStatus?.status === "failed";
  const publishing =
    requesting || (pendingPublication !== null && !publicationFinished);

  useEffect(() => {
    if (!pendingPublication || publicationStatus === undefined) return;
    if (publicationStatus?.status === "complete") {
      toast.success(`Version ${pendingPublication.number} is live`, {
        id: `publication:${pendingPublication.releaseId}:complete`,
      });
    } else if (publicationStatus?.status === "failed") {
      toast.error(
        publicationStatus.failure ?? "The site could not be published.",
        { id: `publication:${pendingPublication.releaseId}:failed` },
      );
    } else if (publicationStatus === null) {
      toast.error(
        "The draft changed before publication completed. Review it and try again.",
        { id: `publication:${pendingPublication.releaseId}:missing` },
      );
    }
  }, [pendingPublication, publicationStatus]);

  const handlePublish = () => {
    setRequesting(true);
    void publish({
      siteId,
      expectedDraftRevision: draftSummary.draftRevision,
    }).then(
      (result) => {
        setRequesting(false);
        if (result.reused) {
          toast.success(`Version ${result.number} is live again`);
          onOpenChange(false);
          return;
        }
        setPendingPublication({
          releaseId: result.releaseId,
          number: result.number,
        });
      },
      (error: unknown) => {
        setRequesting(false);
        toast.error(
          error instanceof Error ? error.message : "The site could not publish",
        );
      },
    );
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && publishing) return;
    onOpenChange(nextOpen);
  };

  return (
    <Dialog
      open={publicationStatus?.status !== "complete"}
      onOpenChange={handleOpenChange}
    >
      <DialogContent
        className="overflow-hidden rounded-2xl border-0 bg-background/80 p-0 text-foreground shadow-2xl backdrop-blur-xl backdrop-saturate-150 sm:max-w-lg"
        onCloseAutoFocus={() => {
          if (publicationStatus?.status === "complete") onOpenChange(false);
        }}
        returnFocusTo={returnFocusTo}
        showCloseButton={false}
      >
        <DialogHeader className="px-5 pt-5 text-left">
          <DialogTitle className="text-base font-semibold">
            {draftSummary.liveRelease
              ? "Publish draft changes"
              : "Publish this site"}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Review and publish the draft changes.
          </DialogDescription>
        </DialogHeader>

        <div className="min-w-0 space-y-4 px-5 pb-5">
          {changes === undefined ? (
            <div className="flex min-h-24 items-center justify-center rounded-xl bg-muted/50">
              <Spinner className="size-5 text-muted-foreground" />
              <span className="sr-only">Loading draft changes</span>
            </div>
          ) : (
            <ChangeList changes={changes ?? []} />
          )}

          <DialogFooter className="gap-2 pt-1 sm:justify-end">
            <Button
              disabled={publishing}
              onClick={() => onOpenChange(false)}
              size="sm"
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              disabled={publishing || changes === undefined || changes === null}
              onClick={() => void handlePublish()}
              size="sm"
            >
              {publishing ? (
                <Spinner />
              ) : (
                <HugeiconsIcon aria-hidden icon={Globe02Icon} />
              )}
              {draftSummary.liveRelease ? "Publish changes" : "Publish site"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ChangeList({ changes }: { changes: DraftChange[] }) {
  if (changes.length === 0) {
    return (
      <Empty className="min-h-24 rounded-xl bg-muted/50 p-3">
        <EmptyHeader>
          <EmptyTitle className="font-normal text-muted-foreground">
            No unpublished changes
          </EmptyTitle>
        </EmptyHeader>
      </Empty>
    );
  }
  return (
    <div className="grid min-w-0 max-h-72 gap-2 overflow-y-auto">
      {changes.map((change) => (
        <div
          className="flex items-start gap-3 rounded-xl bg-muted/50 px-3 py-2.5"
          key={`${change.entityType}:${change.entityId}`}
        >
          <ChangeBadge changeType={change.changeType} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{change.label}</p>
            <p className="text-xs text-muted-foreground">
              {change.details.join(" · ")}
            </p>
          </div>
          <span className="text-xs capitalize text-muted-foreground">
            {change.entityType}
          </span>
        </div>
      ))}
    </div>
  );
}

function ChangeBadge({
  changeType,
}: {
  changeType: DraftChange["changeType"];
}) {
  const styles = {
    added: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
    updated: "bg-blue-500/12 text-blue-700 dark:text-blue-300",
    deleted: "bg-red-500/12 text-red-700 dark:text-red-300",
    moved: "bg-amber-500/12 text-amber-700 dark:text-amber-300",
  };
  return (
    <span
      className={cn(
        "mt-0.5 rounded px-1.5 py-0.5 text-[0.625rem] font-semibold uppercase",
        styles[changeType],
      )}
    >
      {changeType}
    </span>
  );
}
