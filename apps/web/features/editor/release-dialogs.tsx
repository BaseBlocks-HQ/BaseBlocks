"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import {
  Clock03Icon,
  FileClockIcon,
  Globe02Icon,
  InformationCircleIcon,
  Loading03Icon,
  RotateLeft01Icon,
  Tick01Icon,
} from "@hugeicons/core-free-icons";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@baseblocks/ui/dialog";
import { cn } from "@baseblocks/ui/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@baseblocks/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@baseblocks/ui/tooltip";
import { useMutation, useQuery } from "convex/react";
import { useRef, useState } from "react";
import { toast } from "sonner";

type DraftChange = {
  entityType: "site" | "page" | "library" | "folder" | "file";
  entityId: string;
  changeType: "added" | "updated" | "deleted" | "moved";
  label: string;
  details: string[];
};

type ReleaseFieldDiff = {
  label: string;
  before?: string;
  after?: string;
};

type ReleaseDetailedChange = Omit<DraftChange, "details"> & {
  fields: ReleaseFieldDiff[];
  content?: {
    beforeLines: string[];
    afterLines: string[];
  };
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
  open,
  onOpenChange,
  siteId,
}: {
  draftSummary: DraftSummary;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  siteId: Id<"sites">;
}) {
  const publish = useMutation(api.releases.publish);
  const changes = useQuery(
    api.releases.getDraftChanges,
    open ? { siteId } : "skip",
  ) as DraftChange[] | null | undefined;
  const [publishing, setPublishing] = useState(false);

  const handlePublish = async () => {
    setPublishing(true);
    try {
      const result = await publish({
        siteId,
        expectedDraftRevision: draftSummary.draftRevision,
      });
      toast.success(
        result.reused
          ? `Version ${result.number} is live again`
          : `Version ${result.number} is live`,
      );
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "The site could not publish",
      );
    } finally {
      setPublishing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden rounded-[1.5rem] border-sidebar-border bg-sidebar p-0 text-sidebar-foreground shadow-2xl sm:max-w-lg [&_[data-slot='dialog-close']]:top-4 [&_[data-slot='dialog-close']]:right-4">
        <DialogHeader className="px-5 pt-4 pb-0 text-left">
          <DialogTitle className="text-base font-semibold">
            {draftSummary.liveRelease
              ? "Publish draft changes"
              : "Publish this site"}
          </DialogTitle>
          <DialogDescription className="text-sm text-sidebar-foreground/60">
            These private draft changes will replace what visitors currently
            see.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 px-5 pt-4 pb-4">
          {changes === undefined ? (
            <div className="grid min-h-24 place-items-center rounded-xl bg-sidebar-accent/55">
              <HugeiconsIcon
                icon={Loading03Icon}
                className="size-5 animate-spin text-muted-foreground"
              />
            </div>
          ) : (
            <ChangeList changes={changes ?? []} />
          )}

          <DialogFooter className="gap-2 pt-1 sm:justify-end">
            <Button
              className="rounded-full border-sidebar-border/70 bg-transparent px-3.5 text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              disabled={publishing}
              onClick={() => onOpenChange(false)}
              size="sm"
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              className="rounded-full px-4 text-sm"
              disabled={publishing || changes === undefined || changes === null}
              onClick={() => void handlePublish()}
              size="sm"
            >
              {publishing ? (
                <HugeiconsIcon icon={Loading03Icon} className="animate-spin" />
              ) : (
                <HugeiconsIcon icon={Globe02Icon} />
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
      <div className="flex items-center gap-2 rounded-xl bg-sidebar-accent/55 p-3 text-sm text-sidebar-foreground/60">
        <HugeiconsIcon icon={Tick01Icon} className="size-4" />
        No unpublished changes
      </div>
    );
  }
  return (
    <div className="grid max-h-72 gap-2 overflow-y-auto">
      {changes.map((change) => (
        <div
          className="flex items-start gap-3 rounded-xl bg-sidebar-accent/55 px-3 py-2.5"
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
      <div className="flex items-center gap-2 rounded-xl bg-sidebar-accent/55 p-3 text-sm text-sidebar-foreground/60">
        <HugeiconsIcon icon={Tick01Icon} className="size-4" />
        No differences from the previous version
      </div>
    );
  }

  return (
    <div className="grid gap-8">
      {changes.map((change) => (
        <section key={`${change.entityType}:${change.entityId}`}>
          <h4 className="truncate text-sm font-medium">{change.label}</h4>
          <div className="mt-3 grid gap-5 sm:grid-cols-2">
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

  if (!hasValue) {
    return (
      <div
        className={cn(
          "min-w-0",
          separated && "sm:border-s sm:border-border/70 sm:ps-5",
        )}
      >
        <p className="text-sm text-muted-foreground">—</p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "min-w-0",
        separated && "sm:border-s sm:border-border/70 sm:ps-5",
      )}
    >
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
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
      {lines ? (
        <div className={fields.length > 0 ? "mt-3" : "mt-2"}>
          {lines.length > 0 ? (
            <p className="whitespace-pre-wrap break-words text-sm leading-6">
              {lines.join("\n\n")}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

type ReleaseSummary = {
  _id: Id<"siteReleases">;
  number: number;
  previousReleaseId?: Id<"siteReleases">;
  createdAt: number;
  pageCount: number;
  changeCount: number;
  isLive: boolean;
};

const releaseDateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

export function HistoryDialog({
  open,
  onOpenChange,
  siteId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  siteId: Id<"sites">;
}) {
  const releases = useQuery(api.releases.list, open ? { siteId } : "skip") as
    | ReleaseSummary[]
    | undefined;
  const makeLive = useMutation(api.releases.makeLive);
  const restoreToDraft = useMutation(api.releases.restoreToDraft);
  const [selectedId, setSelectedId] = useState<Id<"siteReleases"> | null>(null);
  const [confirmAction, setConfirmAction] = useState<"live" | "restore" | null>(
    null,
  );
  const [working, setWorking] = useState(false);
  const historyTitleRef = useRef<HTMLHeadingElement>(null);
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

  const runConfirmedAction = async () => {
    if (!selected || !confirmAction) return;
    setWorking(true);
    try {
      if (confirmAction === "live") {
        await makeLive({ releaseId: selected._id });
        toast.success(
          `Version ${selected.number} is live. Refresh any open published page to see it.`,
        );
        setConfirmAction(null);
      } else {
        await restoreToDraft({ releaseId: selected._id });
        toast.success(`Version ${selected.number} restored to the draft`);
        window.location.reload();
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "The version could not change",
      );
    } finally {
      setWorking(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="h-[min(88vh,42rem)] w-[calc(100%-2rem)] max-w-[56rem] overflow-hidden rounded-[1.5rem] border-sidebar-border bg-background p-0 text-foreground shadow-2xl sm:max-w-[56rem] [&_[data-slot='dialog-close']]:top-4 [&_[data-slot='dialog-close']]:right-4"
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            historyTitleRef.current?.focus();
          }}
        >
          <DialogDescription className="sr-only">
            Choose what visitors see without changing your private draft. Every
            published version remains available.
          </DialogDescription>
          <SidebarProvider
            className="h-full min-h-0 items-stretch"
            cookieName={null}
          >
            <Sidebar
              className="w-40 border-e border-sidebar-border sm:w-52"
              collapsible="none"
            >
              <SidebarHeader className="h-16 shrink-0 justify-center px-3">
                <div className="flex items-center gap-1">
                  <DialogTitle
                    className="flex min-w-0 items-center gap-2 text-sm font-semibold focus:outline-none"
                    ref={historyTitleRef}
                    tabIndex={-1}
                  >
                    <HugeiconsIcon
                      className="size-4 shrink-0"
                      icon={FileClockIcon}
                    />
                    <span className="truncate">Version history</span>
                  </DialogTitle>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        className="inline-flex size-6 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                        type="button"
                      >
                        <HugeiconsIcon
                          icon={InformationCircleIcon}
                          className="size-3.5"
                        />
                        <span className="sr-only">About version history</span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-64" sideOffset={6}>
                      Choose what visitors see without changing your private
                      draft. Every published version remains available.
                    </TooltipContent>
                  </Tooltip>
                </div>
              </SidebarHeader>
              <SidebarContent>
                <SidebarGroup className="p-2">
                  <SidebarGroupContent>
                    {releases === undefined ? (
                      <div className="grid min-h-32 place-items-center">
                        <HugeiconsIcon
                          icon={Loading03Icon}
                          className="size-5 animate-spin text-muted-foreground"
                        />
                      </div>
                    ) : releases.length === 0 ? (
                      <p className="p-2 text-sm text-muted-foreground">
                        Publish the site to create its first version.
                      </p>
                    ) : (
                      <SidebarMenu>
                        {releases.map((release) => (
                          <SidebarMenuItem key={release._id}>
                            <SidebarMenuButton
                              aria-pressed={selected?._id === release._id}
                              className="h-auto min-h-12 items-start py-2.5"
                              isActive={selected?._id === release._id}
                              onClick={() => setSelectedId(release._id)}
                            >
                              <HugeiconsIcon
                                icon={Clock03Icon}
                                className="mt-0.5 text-muted-foreground"
                              />
                              <span className="min-w-0 flex-1">
                                <span className="flex items-center gap-1.5 font-medium">
                                  Version {release.number}
                                  {release.isLive ? (
                                    <Badge className="px-1.5 py-0 text-[0.625rem]">
                                      Live
                                    </Badge>
                                  ) : null}
                                </span>
                                <span className="mt-0.5 block truncate text-xs font-normal text-muted-foreground">
                                  {releaseDateFormatter.format(
                                    release.createdAt,
                                  )}
                                </span>
                              </span>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        ))}
                      </SidebarMenu>
                    )}
                  </SidebarGroupContent>
                </SidebarGroup>
              </SidebarContent>
            </Sidebar>
            <main className="flex min-h-0 min-w-0 flex-1 flex-col">
              {selected ? (
                <>
                  <div className="min-h-0 flex-1 overflow-y-auto px-5 pt-5 pb-5">
                    <div className="mb-5 flex items-center gap-2">
                      <h3 className="text-sm font-medium">Changes</h3>
                      <Badge variant="secondary">
                        {details?.changes.length ?? selected.changeCount}
                      </Badge>
                    </div>
                    {details === undefined ? (
                      <div className="grid min-h-28 place-items-center">
                        <HugeiconsIcon
                          icon={Loading03Icon}
                          className="size-5 animate-spin text-muted-foreground"
                        />
                      </div>
                    ) : (
                      <VersionComparison
                        afterLabel={`Version ${selected.number}`}
                        beforeLabel={
                          previousRelease
                            ? `Version ${previousRelease.number}`
                            : "—"
                        }
                        changes={details?.changes ?? []}
                      />
                    )}
                  </div>
                  <div className="flex flex-wrap justify-end gap-2 px-5 pb-4">
                    <Button
                      className="rounded-full px-3.5 text-sm"
                      onClick={() => setConfirmAction("restore")}
                      size="sm"
                      variant="outline"
                    >
                      <HugeiconsIcon icon={RotateLeft01Icon} />
                      Restore as draft
                    </Button>
                    {!selected.isLive ? (
                      <Button
                        className="rounded-full px-4 text-sm"
                        onClick={() => setConfirmAction("live")}
                        size="sm"
                      >
                        <HugeiconsIcon icon={Globe02Icon} />
                        Set as live
                      </Button>
                    ) : null}
                  </div>
                </>
              ) : (
                <div className="grid h-full place-items-center text-sm text-muted-foreground">
                  No published versions yet
                </div>
              )}
            </main>
          </SidebarProvider>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={confirmAction !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setConfirmAction(null);
        }}
      >
        <AlertDialogContent className="overflow-hidden rounded-[1.5rem] border-sidebar-border bg-sidebar p-0 text-sidebar-foreground shadow-2xl sm:max-w-[32rem]">
          <AlertDialogHeader className="px-5 pt-5 pb-0 text-left sm:text-left">
            <AlertDialogTitle className="text-base font-semibold text-balance">
              {confirmAction === "live"
                ? `Set version ${selected?.number} as live?`
                : `Restore version ${selected?.number} to the draft?`}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-sidebar-foreground/60">
              {confirmAction === "live"
                ? "Visitors will see this version after their next page load. Your editor stays on its current private draft, and no versions are deleted."
                : "Your private draft will be replaced with this version. Visitors will keep seeing the current live version until you publish the restored draft."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="px-5 pt-3 pb-4 sm:justify-end">
            <AlertDialogCancel
              className="rounded-full border-sidebar-border/70 bg-transparent px-3.5 text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              disabled={working}
              size="sm"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="rounded-full px-4 text-sm"
              disabled={working}
              onClick={() => void runConfirmedAction()}
              size="sm"
            >
              {working ? (
                <HugeiconsIcon icon={Loading03Icon} className="animate-spin" />
              ) : null}
              {confirmAction === "live" ? "Set as live" : "Restore draft"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
