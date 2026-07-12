"use client";

import { useTeamAccess } from "@/features/authentication/team-access";
import { SiteRenderActionsProvider } from "@/components/site-runtime/actions";
import { api, type Doc, type Id } from "@baseblocks/backend";
import { generateSlug } from "@baseblocks/domain";
import { Button } from "@baseblocks/ui/button";
import { Spinner } from "@baseblocks/ui/spinner";
import {
  OpenEditorContent,
  OpenEditorViewer,
  type OpenEditorPageRuntime,
  useOpenEditorController,
} from "@openeditor/react";
import type {
  OpenEditorAttachmentRuntime,
  OpenEditorDocument,
} from "@openeditor/core";
import {
  OpenEditorSelectionBubble,
  OpenEditorSlashMenu,
  OpenEditorThemeProvider,
} from "@openeditor/ui";
import { useMutation, useQuery } from "convex/react";
import {
  ArrowLeft,
  Eye,
  PanelRight,
  PencilLine,
  TriangleAlert,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { convertLegacyPageToOpenEditor } from "./conversion/convert-page";
import { editorV2Extensions } from "./extensions";
import { blockParity, type ParityStatus } from "./parity/block-parity";
import { useBaseBlocksAttachmentRuntime } from "./attachment-runtime";
import { baseBlocksOpenEditorTheme } from "./openeditor-theme";

const statusClass: Record<ParityStatus, string> = {
  converted: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  partial: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  pending: "bg-muted text-muted-foreground",
};

export function SiteEditorV2({
  siteId,
  teamSlug,
  migrationTools = false,
}: {
  siteId: string;
  teamSlug: string;
  migrationTools?: boolean;
}) {
  const { team } = useTeamAccess();
  const searchParams = useSearchParams();
  const router = useRouter();
  const selectedPageId = searchParams.get("page");
  const [mode, setMode] = useState<"editor" | "viewer">("editor");
  const [inspectorOpen, setInspectorOpen] = useState(migrationTools);

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
  const createPage = useMutation(api.pages.create);
  const updatePage = useMutation(api.pages.update);
  const attachmentRuntime = useBaseBlocksAttachmentRuntime(
    siteId as Id<"sites">,
  );
  const resolvedLegacyContent = selectedPage
    ? legacyContent
    : { tabs: [], sections: [] };
  const resolvedPages = pages ?? [];
  const pageRuntime = useMemo<OpenEditorPageRuntime>(
    () => ({
      createPage: async ({ title, icon }) => {
        const suffix = crypto.randomUUID().slice(0, 8);
        const pageId = await createPage({
          siteId: siteId as Id<"sites">,
          parentId: selectedPage?._id,
          title,
          icon: icon ?? undefined,
          slug: `${generateSlug(title) || "page"}-${suffix}`,
          showInNavigation: false,
        });
        return { pageId, title, icon: icon ?? "📄", href: `?page=${pageId}` };
      },
      resolvePage: async (pageId) => {
        const page = resolvedPages.find(
          (candidate: Doc<"pages">) => candidate._id === pageId,
        );
        return page
          ? {
              pageId,
              title: page.title,
              icon: page.icon ?? "📄",
              href: `?page=${pageId}`,
            }
          : null;
      },
      renamePage: async (pageId, title) => {
        await updatePage({ pageId: pageId as Id<"pages">, title });
      },
      openPage: (page) =>
        router.replace(`?page=${page.pageId}`, { scroll: false }),
    }),
    [createPage, resolvedPages, router, selectedPage?._id, siteId, updatePage],
  );

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

  const pageTitles = new Map(
    pages.map((page: Doc<"pages">) => [page._id, page.title]),
  );
  const conversion = convertLegacyPageToOpenEditor(resolvedLegacyContent, {
    pageTitles,
  });
  const initialDocument =
    (resolvedLegacyContent.openEditorDocument as
      | OpenEditorDocument
      | undefined) ?? conversion.document;
  const isMigrated = resolvedLegacyContent.openEditorDocument !== undefined;
  return (
    <SiteRenderActionsProvider actions={{ siteId: siteId as Id<"sites"> }}>
      <div className="flex h-screen min-h-0 w-full flex-col overflow-hidden bg-background">
        <header className="z-20 flex h-14 shrink-0 items-center border-b bg-background/95 px-4 backdrop-blur">
          <div className="flex w-full items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <Button asChild size="sm" variant="ghost">
                <Link
                  href={`/dashboard/${teamSlug}/sites/${siteId}/legacy${selectedPage ? `?page=${selectedPage._id}` : ""}`}
                >
                  <ArrowLeft className="size-4" /> Legacy snapshot
                </Link>
              </Button>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="truncate text-sm font-semibold">
                    {site.name}
                  </h1>
                  <span className="rounded-full bg-violet-500/10 px-2 py-0.5 text-[10px] font-medium text-violet-700 dark:text-violet-300">
                    OpenEditor
                  </span>
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  {selectedPage?.title ?? "No page"} ·{" "}
                  {isMigrated ? "native document" : "migrates on first edit"}
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
              {migrationTools ? (
                <Button
                  onClick={() => setInspectorOpen((current) => !current)}
                  size="sm"
                  variant={inspectorOpen ? "secondary" : "ghost"}
                >
                  <PanelRight className="size-4" /> Migration
                </Button>
              ) : null}
            </div>
          </div>
        </header>

        <div className="flex min-h-0 flex-1 overflow-hidden">
          <aside className="hidden w-56 shrink-0 flex-col border-r bg-background md:flex">
            <div className="shrink-0 border-b px-4 py-3">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Pages
              </h2>
            </div>
            <nav
              className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2"
              aria-label="V2 page comparison"
            >
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
                <p className="px-3 py-2 text-xs text-muted-foreground">
                  This site has no pages.
                </p>
              ) : null}
            </nav>
          </aside>

          <main className="min-h-0 min-w-0 flex-1 overflow-y-auto bg-muted/20">
            <ConvertedEditor
              initialDocument={initialDocument}
              key={selectedPage?._id ?? "empty"}
              mode={mode}
              pageId={selectedPage?._id}
              pageRuntime={pageRuntime}
              attachmentRuntime={attachmentRuntime}
            />
          </main>

          {inspectorOpen ? (
            <aside className="hidden w-80 shrink-0 flex-col border-l bg-background lg:flex">
              <div className="shrink-0 border-b px-4 py-3">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Migration inspector
                </h2>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto">
                <section className="border-b p-4">
                  <h3 className="text-sm font-semibold">Conversion report</h3>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                    <Metric
                      label="Legacy"
                      value={conversion.sourceBlockCount}
                    />
                    <Metric
                      label="Converted"
                      value={conversion.convertedBlockCount}
                    />
                    <Metric
                      label="Pending"
                      value={conversion.placeholderCount}
                    />
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

                <section className="p-4">
                  <h3 className="text-sm font-semibold">Block parity</h3>
                  <div className="mt-3 space-y-2">
                    {blockParity.map((row) => (
                      <div
                        className="rounded-lg border p-2"
                        key={row.legacyType}
                      >
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
              </div>
            </aside>
          ) : null}
        </div>
      </div>
    </SiteRenderActionsProvider>
  );
}

function ConvertedEditor({
  initialDocument,
  mode,
  pageId,
  pageRuntime,
  attachmentRuntime,
}: {
  initialDocument: OpenEditorDocument;
  mode: "editor" | "viewer";
  pageId?: Id<"pages">;
  pageRuntime: OpenEditorPageRuntime;
  attachmentRuntime: OpenEditorAttachmentRuntime<File>;
}) {
  const extensions = editorV2Extensions;
  const saveDocument = useMutation(api.pageContent.saveOpenEditorDocument);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingDocument = useRef<OpenEditorDocument | null>(null);
  const controller = useOpenEditorController({
    initialDocument,
    extensions,
    pageRuntime,
    attachmentRuntime,
    onChange: (document) => {
      if (!pageId) return;
      pendingDocument.current = document;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        const nextDocument = pendingDocument.current;
        pendingDocument.current = null;
        if (nextDocument) {
          void saveDocument({ pageId, document: nextDocument });
        }
      }, 750);
    },
  });

  useEffect(
    () => () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      const nextDocument = pendingDocument.current;
      if (pageId && nextDocument) {
        void saveDocument({ pageId, document: nextDocument });
      }
    },
    [pageId, saveDocument],
  );

  if (mode === "viewer") {
    return (
      <OpenEditorThemeProvider
        className="contents"
        theme={baseBlocksOpenEditorTheme}
      >
        <div className="mx-auto min-h-full max-w-4xl bg-background px-6 py-10 sm:px-10">
          <OpenEditorViewer
            className="oe-viewer"
            document={controller.document}
            extensions={extensions}
            pageRuntime={pageRuntime}
            attachmentRuntime={attachmentRuntime}
          />
        </div>
      </OpenEditorThemeProvider>
    );
  }

  return (
    <OpenEditorThemeProvider
      className="contents"
      theme={baseBlocksOpenEditorTheme}
    >
      <div className="oe-editor-surface mx-auto min-h-full max-w-4xl bg-background px-6 py-10 sm:px-10">
        <OpenEditorContent controller={controller} />
        <OpenEditorSelectionBubble controller={controller} />
        <OpenEditorSlashMenu controller={controller} />
      </div>
    </OpenEditorThemeProvider>
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
