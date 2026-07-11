"use client";

import { useTeamAccess } from "@/features/authentication/team-access";
import { api, type Doc, type Id } from "@baseblocks/backend";
import { Button } from "@baseblocks/ui/button";
import { Spinner } from "@baseblocks/ui/spinner";
import {
  OpenEditorContent,
  OpenEditorViewer,
  useOpenEditorController,
} from "@openeditor/react";
import { OpenEditorSelectionBubble, OpenEditorSlashMenu } from "@openeditor/ui";
import { useQuery } from "convex/react";
import {
  ArrowLeft,
  Columns3,
  Eye,
  PencilLine,
  TriangleAlert,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { convertLegacyPageToOpenEditor } from "./conversion/convert-page";
import { editorV2Extensions } from "./extensions/migration-placeholder";
import { blockParity, type ParityStatus } from "./parity/block-parity";

const statusClass: Record<ParityStatus, string> = {
  converted: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  partial: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  pending: "bg-muted text-muted-foreground",
};

export function SiteEditorV2({
  siteId,
  teamSlug,
}: {
  siteId: string;
  teamSlug: string;
}) {
  const { team } = useTeamAccess();
  const searchParams = useSearchParams();
  const selectedPageId = searchParams.get("page");
  const [mode, setMode] = useState<"editor" | "viewer">("editor");

  const site = useQuery(api.sites.get, { siteId: siteId as Id<"sites"> });
  const pages = useQuery(api.pages.list, { siteId: siteId as Id<"sites"> });
  const selectedPage = selectedPageId
    ? (pages?.find((page: Doc<"pages">) => page._id === selectedPageId) ??
      pages?.[0])
    : pages?.[0];
  const legacyContent = useQuery(
    api.pageContent.get,
    selectedPage ? { pageId: selectedPage._id } : "skip",
  );
  const resolvedLegacyContent = selectedPage
    ? legacyContent
    : { tabs: [], sections: [] };

  if (
    site === undefined ||
    pages === undefined ||
    resolvedLegacyContent === undefined
  ) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner className="size-6 text-muted-foreground" />
      </div>
    );
  }

  if (!site || site.organizationId !== team._id) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        Site not found
      </div>
    );
  }

  const conversion = convertLegacyPageToOpenEditor(resolvedLegacyContent);

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background px-4 py-3">
        <div className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Button asChild size="sm" variant="ghost">
              <Link
                href={`/dashboard/${teamSlug}/sites/${siteId}${selectedPage ? `?page=${selectedPage._id}` : ""}`}
              >
                <ArrowLeft className="size-4" /> Legacy editor
              </Link>
            </Button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="truncate text-sm font-semibold">{site.name}</h1>
                <span className="rounded-full bg-violet-500/10 px-2 py-0.5 text-[10px] font-medium text-violet-700 dark:text-violet-300">
                  V2
                </span>
              </div>
              <p className="truncate text-xs text-muted-foreground">
                {selectedPage?.title ?? "No page"} · converted from legacy ·
                never saved
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setMode("editor")}
              size="sm"
              variant={mode === "editor" ? "secondary" : "ghost"}
            >
              <PencilLine className="size-4" /> Editor
            </Button>
            <Button
              onClick={() => setMode("viewer")}
              size="sm"
              variant={mode === "viewer" ? "secondary" : "ghost"}
            >
              <Eye className="size-4" /> Viewer
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1500px] gap-5 p-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="min-h-[calc(100vh-7rem)] rounded-2xl border bg-background shadow-sm">
          <ConvertedEditor
            conversion={conversion}
            key={selectedPage?._id ?? "empty"}
            mode={mode}
          />
        </section>

        <aside className="space-y-4">
          <section className="rounded-2xl border bg-background p-4">
            <h2 className="text-sm font-semibold">Pages</h2>
            <nav className="mt-3 space-y-1" aria-label="V2 page comparison">
              {pages.map((page: Doc<"pages">) => (
                <Link
                  className={`block truncate rounded-lg px-3 py-2 text-xs transition-colors ${
                    page._id === selectedPage?._id
                      ? "bg-violet-500/10 font-medium text-violet-700 dark:text-violet-300"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                  href={`?page=${page._id}`}
                  key={page._id}
                >
                  {page.title}
                </Link>
              ))}
              {pages.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  This site has no pages.
                </p>
              ) : null}
            </nav>
          </section>

          <section className="rounded-2xl border bg-background p-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <Columns3 className="size-4" /> Conversion report
            </h2>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
              <Metric label="Legacy" value={conversion.sourceBlockCount} />
              <Metric
                label="Converted"
                value={conversion.convertedBlockCount}
              />
              <Metric label="Pending" value={conversion.placeholderCount} />
            </div>
            {conversion.warnings.length > 0 ? (
              <ul className="mt-4 space-y-2">
                {conversion.warnings.map((warning, index) => (
                  <li
                    className="flex gap-2 rounded-lg bg-muted/60 p-2 text-xs"
                    key={`${warning.code}-${warning.blockId ?? index}`}
                  >
                    <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-amber-600" />
                    {warning.message}
                  </li>
                ))}
              </ul>
            ) : null}
          </section>

          <section className="rounded-2xl border bg-background p-4">
            <h2 className="text-sm font-semibold">Block parity</h2>
            <div className="mt-3 space-y-2">
              {blockParity.map((row) => (
                <div className="rounded-lg border p-2" key={row.legacyType}>
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-medium">{row.legacyType}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 ${statusClass[row.status]}`}
                    >
                      {row.status}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {row.target} · {row.note}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function ConvertedEditor({
  conversion,
  mode,
}: {
  conversion: ReturnType<typeof convertLegacyPageToOpenEditor>;
  mode: "editor" | "viewer";
}) {
  const extensions = editorV2Extensions;
  const controller = useOpenEditorController({
    initialDocument: conversion.document,
    extensions,
  });

  if (mode === "viewer") {
    return (
      <OpenEditorViewer
        className="oe-viewer p-6 sm:p-10"
        document={controller.document}
        extensions={extensions}
      />
    );
  }

  return (
    <div className="oe-editor-surface min-h-[calc(100vh-7rem)] p-6 sm:p-10">
      <OpenEditorContent controller={controller} />
      <OpenEditorSelectionBubble controller={controller} />
      <OpenEditorSlashMenu controller={controller} />
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-muted p-2">
      <div className="text-lg font-semibold">{value}</div>
      <div className="text-muted-foreground">{label}</div>
    </div>
  );
}
