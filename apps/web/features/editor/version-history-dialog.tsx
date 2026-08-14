"use client";

import { api, type Id } from "@baseblocks/backend";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@baseblocks/ui/alert-dialog";
import { Badge } from "@baseblocks/ui/badge";
import { Button } from "@baseblocks/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@baseblocks/ui/dialog";
import { Empty, EmptyHeader, EmptyTitle } from "@baseblocks/ui/empty";
import { cn } from "@baseblocks/ui/lib/utils";
import { Spinner } from "@baseblocks/ui/spinner";
import {
  Clock03Icon,
  Globe02Icon,
  Undo02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

type ReleaseFieldDiff = {
  label: string;
  before?: string;
  after?: string;
};

type ReleaseDetailedChange = {
  entityType: "site" | "page" | "library" | "folder" | "file";
  entityId: string;
  changeType: "added" | "updated" | "deleted" | "moved";
  label: string;
  fields: ReleaseFieldDiff[];
  content?: {
    beforeLines: string[];
    afterLines: string[];
  };
};

type ReleaseSummary = {
  _id: Id<"siteReleases">;
  number: number;
  previousReleaseId?: Id<"siteReleases">;
  createdAt: number;
  pageCount: number;
  changeCount: number;
  isLive: boolean;
};

const releaseDateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
});

export function HistoryDialog({
  onOpenChange,
  returnFocusTo,
  siteId,
}: {
  onOpenChange: (open: boolean) => void;
  returnFocusTo?: HTMLElement | null;
  siteId: Id<"sites">;
}) {
  const releases = useQuery(api.releases.list, { siteId }) as
    | ReleaseSummary[]
    | undefined;
  const makeLive = useMutation(api.releases.makeLive);
  const restoreToDraft = useMutation(api.draftRestores.restore);
  const resumeDraftRestore = useMutation(api.draftRestores.resume);
  const [selectedId, setSelectedId] = useState<Id<"siteReleases"> | null>(null);
  const [confirmAction, setConfirmAction] = useState<"live" | "restore" | null>(
    null,
  );
  const [requesting, setRequesting] = useState(false);
  const [pendingRestoreId, setPendingRestoreId] = useState<
    Id<"draftRestores"> | undefined
  >();
  const restoreStatus = useQuery(
    api.draftRestores.status,
    pendingRestoreId ? { restoreId: pendingRestoreId } : "skip",
  );
  const restoreIsRunning =
    pendingRestoreId !== undefined &&
    (restoreStatus === undefined ||
      restoreStatus?.status === "validating" ||
      restoreStatus?.status === "applying");
  const working = requesting || restoreIsRunning;
  const selected =
    releases?.find((release) => release._id === selectedId) ??
    releases?.[0] ??
    null;
  const previousRelease = releases?.find(
    (release) => release._id === selected?.previousReleaseId,
  );
  const details = useQuery(
    api.releases.get,
    selected ? { releaseId: selected._id } : "skip",
  ) as
    | { changes: ReleaseDetailedChange[]; release: ReleaseSummary }
    | null
    | undefined;

  useEffect(() => {
    if (!pendingRestoreId || restoreStatus === undefined) return;
    if (restoreStatus?.status === "complete") {
      toast.success(
        `Version ${selected?.number ?? ""} restored to the draft`.trim(),
        { id: `restore:${pendingRestoreId}:complete` },
      );
      window.location.reload();
      return;
    }
    if (restoreStatus?.status === "paused") {
      toast.error(
        restoreStatus.failure ??
          "The restore paused safely. Resume it to finish applying the draft.",
        { id: `restore:${pendingRestoreId}:paused` },
      );
      return;
    }
    if (
      restoreStatus === null ||
      restoreStatus?.status === "failed" ||
      restoreStatus?.status === "cancelled"
    ) {
      toast.error(
        restoreStatus?.failure ?? "The version could not be restored",
        { id: `restore:${pendingRestoreId}:failed` },
      );
    }
  }, [pendingRestoreId, restoreStatus, selected?.number]);

  const runConfirmedAction = () => {
    if (!selected || !confirmAction) return;
    setRequesting(true);
    if (confirmAction === "live") {
      void makeLive({ releaseId: selected._id }).then(
        () => {
          setRequesting(false);
          toast.success(
            `Version ${selected.number} is live. Refresh any open published page to see it.`,
          );
          setConfirmAction(null);
        },
        (error: unknown) => {
          setRequesting(false);
          toast.error(
            error instanceof Error
              ? error.message
              : "The version could not change",
          );
        },
      );
      return;
    }

    const restoreRequest =
      pendingRestoreId && restoreStatus?.status === "paused"
        ? resumeDraftRestore({ restoreId: pendingRestoreId }).then(
            () => pendingRestoreId,
          )
        : restoreToDraft({ releaseId: selected._id }).then(
            (result) => result.restoreId,
          );
    void restoreRequest.then(
      (restoreId) => {
        setPendingRestoreId(restoreId);
        setRequesting(false);
      },
      (error: unknown) => {
        setRequesting(false);
        toast.error(
          error instanceof Error
            ? error.message
            : "The version could not change",
        );
      },
    );
  };

  return (
    <>
      <HistoryDialogView
        details={details}
        onAction={setConfirmAction}
        onOpenChange={onOpenChange}
        onSelect={setSelectedId}
        previousRelease={previousRelease}
        releases={releases}
        returnFocusTo={returnFocusTo}
        selected={selected}
      />
      <HistoryActionDialog
        action={confirmAction}
        onActionChange={setConfirmAction}
        onConfirm={runConfirmedAction}
        restorePaused={restoreStatus?.status === "paused"}
        selected={selected}
        working={working}
      />
    </>
  );
}

function HistoryDialogView({
  details,
  onAction,
  onOpenChange,
  onSelect,
  previousRelease,
  releases,
  returnFocusTo,
  selected,
}: {
  details:
    | { changes: ReleaseDetailedChange[]; release: ReleaseSummary }
    | null
    | undefined;
  onAction: (action: "live" | "restore") => void;
  onOpenChange: (open: boolean) => void;
  onSelect: (releaseId: Id<"siteReleases">) => void;
  previousRelease: ReleaseSummary | undefined;
  releases: ReleaseSummary[] | undefined;
  returnFocusTo?: HTMLElement | null;
  selected: ReleaseSummary | null;
}) {
  const historyTitleRef = useRef<HTMLHeadingElement>(null);
  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent
        className="h-[min(88vh,40rem)] w-[calc(100%-1.5rem)] max-w-[52rem] grid-rows-[minmax(0,1fr)] gap-0 overflow-hidden rounded-2xl border-0 bg-background/70 p-0 text-foreground shadow-2xl backdrop-blur-xl backdrop-saturate-150 sm:max-w-[52rem] [&_[data-slot='dialog-close']]:top-2 [&_[data-slot='dialog-close']]:right-2 [&_[data-slot='dialog-close']]:flex [&_[data-slot='dialog-close']]:size-8 [&_[data-slot='dialog-close']]:items-center [&_[data-slot='dialog-close']]:justify-center [&_[data-slot='dialog-close']]:rounded-lg"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          historyTitleRef.current?.focus();
        }}
        returnFocusTo={returnFocusTo}
      >
        <DialogTitle className="sr-only" ref={historyTitleRef} tabIndex={-1}>
          Version history
        </DialogTitle>
        <DialogDescription className="sr-only">
          Review, restore, or publish a previous site version.
        </DialogDescription>
        <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)] grid-rows-[auto_minmax(0,1fr)] md:grid-cols-[12rem_minmax(0,1fr)] md:grid-rows-1">
          <aside className="min-h-32 max-h-48 overflow-y-auto bg-sidebar/35 p-2 pe-12 md:max-h-none md:min-h-0 md:pe-2">
            <ReleaseHistoryList
              onSelect={onSelect}
              releases={releases}
              selected={selected}
            />
          </aside>
          <SelectedReleaseDetails
            details={details}
            onAction={onAction}
            previousRelease={previousRelease}
            selected={selected}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ReleaseHistoryList({
  onSelect,
  releases,
  selected,
}: {
  onSelect: (releaseId: Id<"siteReleases">) => void;
  releases: ReleaseSummary[] | undefined;
  selected: ReleaseSummary | null;
}) {
  if (releases === undefined) {
    return (
      <div className="flex min-h-32 items-center justify-center">
        <Spinner className="size-5 text-muted-foreground" />
        <span className="sr-only">Loading version history</span>
      </div>
    );
  }
  if (releases.length === 0) {
    return (
      <Empty className="min-h-32 rounded-none p-2">
        <EmptyHeader>
          <EmptyTitle className="font-normal text-muted-foreground">
            Publish the site to create its first version
          </EmptyTitle>
        </EmptyHeader>
      </Empty>
    );
  }
  return (
    <nav aria-label="Published versions" className="grid gap-1">
      {releases.map((release) => {
        const active = selected?._id === release._id;
        return (
          <button
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-12 w-full min-w-0 items-start gap-2 rounded-lg px-2.5 py-2 text-start outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/50",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
            )}
            key={release._id}
            onClick={() => onSelect(release._id)}
            type="button"
          >
            <HugeiconsIcon
              aria-hidden
              className="mt-0.5 size-4 shrink-0"
              icon={Clock03Icon}
            />
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5 text-sm font-medium">
                Version {release.number}
                {release.isLive ? (
                  <Badge className="px-1.5 py-0 text-[0.625rem]">Live</Badge>
                ) : null}
              </span>
              <span className="mt-0.5 block truncate text-xs font-normal text-muted-foreground">
                {releaseDateFormatter.format(release.createdAt)}
              </span>
            </span>
          </button>
        );
      })}
    </nav>
  );
}

function SelectedReleaseDetails({
  details,
  onAction,
  previousRelease,
  selected,
}: {
  details:
    | { changes: ReleaseDetailedChange[]; release: ReleaseSummary }
    | null
    | undefined;
  onAction: (action: "live" | "restore") => void;
  previousRelease: ReleaseSummary | undefined;
  selected: ReleaseSummary | null;
}) {
  if (!selected) {
    return (
      <main className="flex min-h-0 min-w-0 flex-col">
        <Empty className="h-full">
          <EmptyHeader>
            <EmptyTitle className="font-normal text-muted-foreground">
              No published versions yet
            </EmptyTitle>
          </EmptyHeader>
        </Empty>
      </main>
    );
  }
  return (
    <main className="flex min-h-0 min-w-0 flex-col">
      <header className="flex min-h-16 shrink-0 flex-wrap items-center justify-between gap-3 px-5 py-3 pe-12 sm:px-6 sm:pe-12">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="brand-display truncate text-2xl leading-none font-normal tracking-[-0.025em]">
              Version {selected.number}
            </h3>
            {selected.isLive ? <Badge>Live</Badge> : null}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {releaseDateFormatter.format(selected.createdAt)}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button
            onClick={() => onAction("restore")}
            size="sm"
            variant="outline"
          >
            <HugeiconsIcon aria-hidden icon={Undo02Icon} />
            Restore as draft
          </Button>
          {!selected.isLive ? (
            <Button onClick={() => onAction("live")} size="sm">
              <HugeiconsIcon aria-hidden icon={Globe02Icon} />
              Set as live
            </Button>
          ) : null}
        </div>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-6 sm:px-6">
        <div className="mb-5 flex items-center gap-2 border-b pb-3">
          <h4 className="text-sm font-medium">Changes</h4>
          <Badge variant="secondary">
            {details?.changes.length ?? selected.changeCount}
          </Badge>
        </div>
        {details === undefined ? (
          <div className="flex min-h-28 items-center justify-center">
            <Spinner className="size-5 text-muted-foreground" />
            <span className="sr-only">Loading version changes</span>
          </div>
        ) : (
          <VersionComparison
            afterLabel={`Version ${selected.number}`}
            beforeLabel={
              previousRelease ? `Version ${previousRelease.number}` : "—"
            }
            changes={details?.changes ?? []}
          />
        )}
      </div>
    </main>
  );
}

function VersionComparison({
  afterLabel,
  beforeLabel,
  changes,
}: {
  afterLabel: string;
  beforeLabel: string;
  changes: ReleaseDetailedChange[];
}) {
  if (changes.length === 0) {
    return (
      <Empty className="min-h-28 rounded-xl bg-muted/50 p-3">
        <EmptyHeader>
          <EmptyTitle className="font-normal text-muted-foreground">
            No differences from the previous version
          </EmptyTitle>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="grid gap-7">
      {changes.map((change) => (
        <section key={`${change.entityType}:${change.entityId}`}>
          <div className="flex items-center gap-2">
            <h5 className="truncate text-sm font-medium">{change.label}</h5>
            <span className="text-xs capitalize text-muted-foreground">
              {change.entityType}
            </span>
          </div>
          <div className="mt-3 grid overflow-hidden rounded-xl bg-muted/35 sm:grid-cols-2">
            <VersionSnapshot
              fields={change.fields.map((field) => ({
                label: field.label,
                value: field.before,
              }))}
              label={beforeLabel}
              lines={change.content?.beforeLines}
            />
            <VersionSnapshot
              fields={change.fields.map((field) => ({
                label: field.label,
                value: field.after,
              }))}
              label={afterLabel}
              lines={change.content?.afterLines}
              separated
            />
          </div>
        </section>
      ))}
    </div>
  );
}

function VersionSnapshot({
  fields,
  label,
  lines,
  separated = false,
}: {
  fields: Array<{ label: string; value?: string }>;
  label: string;
  lines?: string[];
  separated?: boolean;
}) {
  const hasValue =
    fields.some(
      (field) => field.value !== undefined && field.value !== "Not set",
    ) || (lines?.length ?? 0) > 0;

  return (
    <div
      className={cn(
        "min-w-0 p-4",
        separated && "border-t border-border/70 sm:border-t-0 sm:border-s",
      )}
    >
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      {!hasValue ? (
        <p className="mt-3 text-sm text-muted-foreground">—</p>
      ) : (
        <>
          {fields.length > 0 ? (
            <dl className="mt-3 grid gap-2.5">
              {fields.map((field) => (
                <div key={field.label}>
                  <dt className="text-[0.6875rem] text-muted-foreground">
                    {field.label}
                  </dt>
                  <dd className="mt-0.5 break-words text-sm">
                    {field.value === undefined || field.value === "Not set"
                      ? "—"
                      : field.value}
                  </dd>
                </div>
              ))}
            </dl>
          ) : null}
          {lines && lines.length > 0 ? (
            <p
              className={cn(
                "whitespace-pre-wrap break-words text-sm leading-6",
                fields.length > 0 ? "mt-3" : "mt-2",
              )}
            >
              {lines.join("\n\n")}
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}

function HistoryActionDialog({
  action,
  onActionChange,
  onConfirm,
  restorePaused,
  selected,
  working,
}: {
  action: "live" | "restore" | null;
  onActionChange: (action: "live" | "restore" | null) => void;
  onConfirm: () => void;
  restorePaused: boolean;
  selected: ReleaseSummary | null;
  working: boolean;
}) {
  return (
    <AlertDialog
      open={action !== null}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && working) return;
        if (!nextOpen) onActionChange(null);
      }}
    >
      <AlertDialogContent className="overflow-hidden rounded-2xl border-0 bg-background/80 p-0 text-foreground shadow-2xl backdrop-blur-xl backdrop-saturate-150 sm:max-w-[32rem]">
        <AlertDialogHeader className="px-5 pt-5 text-left sm:text-left">
          <AlertDialogTitle className="text-base font-semibold text-balance">
            {action === "live"
              ? `Set version ${selected?.number} as live?`
              : `Restore version ${selected?.number} to the draft?`}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm text-muted-foreground">
            {action === "live"
              ? "Visitors will see this version after their next page load. Your private draft will not change."
              : "This version will replace your private draft. The live site will not change until you publish the restored draft."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="px-5 pt-3 pb-5 sm:justify-end">
          <AlertDialogCancel disabled={working} size="sm">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction disabled={working} onClick={onConfirm} size="sm">
            {working ? <Spinner /> : null}
            {action === "live"
              ? "Set as live"
              : restorePaused
                ? "Resume restore"
                : "Restore draft"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
