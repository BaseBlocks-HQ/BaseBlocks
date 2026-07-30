"use client";

import { getTeamSiteEditorPath } from "@/features/dashboard/routes";
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@baseblocks/ui/dialog";
import { Input } from "@baseblocks/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@baseblocks/ui/select";
import type { FunctionReturnType } from "convex/server";
import { useAction, useQuery } from "convex/react";
import {
  ArrowUpRight,
  Check,
  ExternalLink,
  FileInput,
  LoaderCircle,
  RefreshCw,
  Search,
  TriangleAlert,
} from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { toast } from "sonner";

type IntegrationResource = FunctionReturnType<
  typeof api.integrations.listResources
>[number];

function ResourceStatus({
  binding,
}: {
  binding: IntegrationResource["bindings"][number];
}) {
  const t = useTranslations("integrations.content");
  if (binding.status === "synced") {
    return (
      <Badge variant="secondary">
        <Check />
        {t("status.synced")}
      </Badge>
    );
  }
  if (binding.status === "updateAvailable") {
    return <Badge variant="outline">{t("status.updateAvailable")}</Badge>;
  }
  if (binding.status === "localChanges") {
    return <Badge variant="outline">{t("status.localChanges")}</Badge>;
  }
  if (binding.status === "conflict") {
    return (
      <Badge variant="destructive">
        <TriangleAlert />
        {t("status.conflict")}
      </Badge>
    );
  }
  return <Badge variant="destructive">{t("status.missing")}</Badge>;
}

export function NotionContentDialog({
  connectionId,
  organizationId,
  teamSlug,
}: {
  connectionId: Id<"integrationConnections">;
  organizationId: string;
  teamSlug: string;
}) {
  const t = useTranslations("integrations.content");
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedSiteId, setSelectedSiteId] = useState<Id<"sites"> | null>(
    null,
  );
  const [busyResourceId, setBusyResourceId] = useState<string | null>(null);
  const [overwriteResource, setOverwriteResource] =
    useState<IntegrationResource | null>(null);
  const resources = useQuery(
    api.integrations.listResources,
    open ? { connectionId } : "skip",
  );
  const sites = useQuery(
    api.sites.listByTeam,
    open ? { organizationId } : "skip",
  );
  const importPage = useAction(api.integrations.importNotionPage);

  const organizationSites = sites ?? [];
  const destinationSiteId =
    selectedSiteId ?? organizationSites.at(0)?._id ?? null;
  const visibleResources = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase();
    return (resources ?? []).filter(
      (resource) =>
        resource.canImport &&
        (!normalizedSearch ||
          resource.title.toLocaleLowerCase().includes(normalizedSearch)),
    );
  }, [resources, search]);

  const runImport = async (resource: IntegrationResource, force = false) => {
    if (!destinationSiteId) return;
    setBusyResourceId(resource._id);
    try {
      const result = await importPage({
        resourceId: resource._id,
        siteId: destinationSiteId,
        force,
      });
      if (result.status === "localChanges") {
        setOverwriteResource(resource);
        return;
      }
      toast.success(t("imported", { title: resource.title }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("importFailed"));
    } finally {
      setBusyResourceId(null);
    }
  };

  const handleOverwrite = async () => {
    const resource = overwriteResource;
    setOverwriteResource(null);
    if (resource) await runImport(resource, true);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button size="sm" variant="outline">
            <FileInput />
            {t("manage")}
          </Button>
        </DialogTrigger>
        <DialogContent className="flex h-[min(46rem,calc(100vh-2rem))] max-w-4xl flex-col gap-0 overflow-hidden p-0">
          <DialogHeader className="border-b px-6 py-5">
            <DialogTitle>{t("title")}</DialogTitle>
            <DialogDescription>{t("description")}</DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 border-b bg-muted/30 px-6 py-4 sm:grid-cols-[minmax(0,1fr)_15rem]">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                aria-label={t("searchLabel")}
                className="pl-9"
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t("searchPlaceholder")}
                value={search}
              />
            </div>
            {organizationSites.length ? (
              <Select
                onValueChange={(value) =>
                  setSelectedSiteId(value as Id<"sites">)
                }
                value={destinationSiteId ?? undefined}
              >
                <SelectTrigger className="w-full" aria-label={t("siteLabel")}>
                  <SelectValue placeholder={t("sitePlaceholder")} />
                </SelectTrigger>
                <SelectContent align="end">
                  {organizationSites.map((site) => (
                    <SelectItem key={site._id} value={site._id}>
                      {site.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            {resources === undefined || sites === undefined ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                <LoaderCircle className="mr-2 size-4 animate-spin" />
                {t("loading")}
              </div>
            ) : organizationSites.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center px-6 text-center">
                <p className="font-medium">{t("noSitesTitle")}</p>
                <p className="mt-1 max-w-md text-sm text-muted-foreground">
                  {t("noSitesDescription")}
                </p>
              </div>
            ) : visibleResources.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center px-6 text-center">
                <p className="font-medium">
                  {search ? t("noResultsTitle") : t("emptyTitle")}
                </p>
                <p className="mt-1 max-w-md text-sm text-muted-foreground">
                  {search ? t("noResultsDescription") : t("emptyDescription")}
                </p>
              </div>
            ) : (
              <div className="divide-y rounded-lg border">
                {visibleResources.map((resource) => {
                  const binding = resource.bindings.find(
                    (candidate) => candidate.siteId === destinationSiteId,
                  );
                  const busy = busyResourceId === resource._id;
                  const actionLabel = !binding
                    ? t("actions.import")
                    : binding.status === "synced" ||
                        binding.status === "localChanges"
                      ? t("actions.reimport")
                      : t("actions.sync");

                  return (
                    <div
                      className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center"
                      key={resource._id}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-medium">
                            {resource.title}
                          </p>
                          {binding ? (
                            <ResourceStatus binding={binding} />
                          ) : null}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                          {binding ? (
                            <span>
                              {t("draftPage", { title: binding.pageTitle })}
                            </span>
                          ) : (
                            <span>{t("notImported")}</span>
                          )}
                          {resource.url ? (
                            <a
                              className="inline-flex items-center gap-1 hover:text-foreground"
                              href={resource.url}
                              rel="noreferrer"
                              target="_blank"
                            >
                              {t("openNotion")}
                              <ExternalLink className="size-3" />
                            </a>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {binding && binding.status !== "missing" ? (
                          <Button asChild size="sm" variant="ghost">
                            <Link
                              href={`${getTeamSiteEditorPath(teamSlug, binding.siteId)}?page=${binding.pageId}`}
                            >
                              {t("actions.openDraft")}
                              <ArrowUpRight />
                            </Link>
                          </Button>
                        ) : null}
                        <Button
                          disabled={busy}
                          onClick={() => {
                            if (
                              binding?.status === "localChanges" ||
                              binding?.status === "conflict"
                            ) {
                              setOverwriteResource(resource);
                              return;
                            }
                            void runImport(resource);
                          }}
                          size="sm"
                          variant={binding ? "outline" : "default"}
                        >
                          {busy ? (
                            <LoaderCircle className="animate-spin" />
                          ) : binding ? (
                            <RefreshCw />
                          ) : (
                            <FileInput />
                          )}
                          {actionLabel}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(overwriteResource)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setOverwriteResource(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("overwrite.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("overwrite.description")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("overwrite.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleOverwrite()}
              variant="destructive"
            >
              {t("overwrite.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
