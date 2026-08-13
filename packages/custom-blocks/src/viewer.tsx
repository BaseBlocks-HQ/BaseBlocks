"use client";

/* oxlint-disable react-doctor/nextjs-no-img-element -- Managed assets are host-resolved private or blob URLs. This framework-neutral package must not depend on the Next.js image pipeline. */

import { defineOpenEditorCustomBlockViewer } from "@openeditor/custom-block/viewer";
import { getDocumentText } from "@openeditor/core";
import {
  AppWindowIcon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  ArrowUpRight01Icon,
  Link02Icon,
  Search01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@baseblocks/ui/button";
import { Input } from "@baseblocks/ui/input";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { OpenEditorCustomBlockViewerHost } from "@openeditor/custom-block/viewer";
import type { QuickLink } from "./quick-links";
import { decisionTreeBlock, directoryBlock, quickLinksBlock } from "./index";
import { resolveDecisionTree } from "./decision-tree-navigation";
import { destinationLabel } from "./quick-links";
import { BlockShell, selectClassName } from "./ui";

export const directoryViewer = defineOpenEditorCustomBlockViewer({
  block: directoryBlock,
  render: function DirectoryViewer({ data }) {
    const [activeId, setActiveId] = useState(data.directories[0]?.id ?? "");
    const [query, setQuery] = useState("");
    const [page, setPage] = useState(0);
    const active =
      data.directories.find(({ id }) => id === activeId) ?? data.directories[0];
    if (!active) return null;
    const filtered = active.rows.filter((row) =>
      Object.values(row.cells).some((cell) =>
        cell.toLocaleLowerCase().includes(query.toLocaleLowerCase()),
      ),
    );
    const pageSize = active.pageSize ?? Math.max(1, filtered.length);
    const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const visible = filtered.slice(page * pageSize, (page + 1) * pageSize);
    return (
      <BlockShell label="Directory">
        {data.directories.length > 1 ? (
          <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <span>Directory</span>
            <select
              className={`${selectClassName} max-w-56`}
              onChange={(event) => {
                setActiveId(event.target.value);
                setPage(0);
              }}
              value={active.id}
            >
              {data.directories.map((directory) => (
                <option key={directory.id} value={directory.id}>
                  {directory.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        {active.rows.length > 5 ? (
          <div className="relative max-w-sm">
            <HugeiconsIcon
              aria-hidden
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              icon={Search01Icon}
            />
            <Input
              aria-label="Search directory"
              className="rounded-xl pl-10 shadow-none"
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(0);
              }}
              placeholder="Search"
              type="search"
              value={query}
            />
          </div>
        ) : null}
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full table-fixed text-sm">
            <caption className="sr-only">{active.label}</caption>
            <thead>
              <tr className="border-b border-border/60 bg-muted/30">
                {active.columnIds.map((columnId, index) => (
                  <th
                    className="border-l border-border/60 px-3 py-2 text-left text-xs font-medium text-muted-foreground first:border-l-0"
                    key={columnId}
                    scope="col"
                  >{`Column ${index + 1}`}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => (
                <tr
                  className="border-b border-border/50 last:border-0"
                  key={row.id}
                >
                  {active.columnIds.map((columnId) => (
                    <td
                      className="whitespace-normal border-l border-border/60 px-3 py-2 align-top first:border-l-0 [overflow-wrap:anywhere]"
                      key={columnId}
                    >
                      {row.cells[columnId] ?? ""}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pages > 1 ? (
          <nav
            aria-label="Directory pages"
            className="flex min-h-8 items-center justify-end gap-1 text-xs text-muted-foreground"
          >
            <Button
              aria-label="Previous page"
              disabled={page === 0}
              onClick={() => setPage(page - 1)}
              size="icon-xs"
              type="button"
              variant="ghost"
            >
              <HugeiconsIcon icon={ArrowLeft01Icon} />
            </Button>
            <span className="min-w-20 text-center tabular-nums">{`Page ${page + 1} of ${pages}`}</span>
            <Button
              aria-label="Next page"
              disabled={page + 1 >= pages}
              onClick={() => setPage(page + 1)}
              size="icon-xs"
              type="button"
              variant="ghost"
            >
              <HugeiconsIcon icon={ArrowRight01Icon} />
            </Button>
          </nav>
        ) : null}
      </BlockShell>
    );
  },
});

export const decisionTreeViewer = defineOpenEditorCustomBlockViewer({
  block: decisionTreeBlock,
  render: function DecisionTreeViewer({ data }) {
    const [treeId, setTreeId] = useState(data.trees[0]?.id ?? "");
    const [path, setPath] = useState<string[]>([]);
    const tree = data.trees.find(({ id }) => id === treeId) ?? data.trees[0];
    const state = useMemo(() => {
      const nodes = tree?.nodes ?? [];
      const root = resolveDecisionTree(nodes, []);
      const effectivePath =
        path.length === 0 && root.visibleOptions.length === 1
          ? [root.visibleOptions[0]!.id]
          : path;
      return resolveDecisionTree(nodes, effectivePath);
    }, [tree, path]);
    if (!tree) return null;
    return (
      <BlockShell label="Decision tree">
        {data.trees.length > 1 ? (
          <select
            aria-label="Decision tree"
            className={`${selectClassName} max-w-56`}
            onChange={(event) => {
              setTreeId(event.target.value);
              setPath([]);
            }}
            value={tree.id}
          >
            {data.trees.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        ) : null}
        <div className="flex min-h-72 flex-col justify-center rounded-2xl bg-background p-5 sm:p-8">
          {state.path.length > 1 || path.length > 0 ? (
            <Button
              className="mx-auto order-3 mt-5"
              onClick={() => {
                const next = state.path.slice(0, -1);
                setPath(next.length === 1 ? [] : next);
              }}
              size="sm"
              type="button"
              variant="ghost"
            >
              <HugeiconsIcon aria-hidden icon={ArrowLeft01Icon} />
              Previous question
            </Button>
          ) : null}
          {state.activeNode ? (
            <h3 className="mb-5 text-balance text-center text-2xl font-semibold leading-tight">
              {getDocumentText(state.activeNode.document) || "Untitled step"}
            </h3>
          ) : null}
          <nav aria-label="Decision options" className="grid gap-2">
            {state.visibleOptions.map((node) => (
              <button
                className="group flex min-h-14 w-full items-center justify-between rounded-2xl bg-card p-4 text-left shadow-xs transition-[box-shadow,transform] hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                key={node.id}
                onClick={() => setPath([...state.path, node.id])}
                type="button"
              >
                <span className="text-sm font-medium">{node.name}</span>
                <HugeiconsIcon
                  aria-hidden
                  className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                  icon={ArrowRight01Icon}
                />
              </button>
            ))}
          </nav>
        </div>
      </BlockShell>
    );
  },
});

export const quickLinksViewer = defineOpenEditorCustomBlockViewer({
  block: quickLinksBlock,
  render: function QuickLinksViewer({ data, host }) {
    return (
      <nav aria-label="Quick links" className="not-prose my-4">
        <ul className="m-0 grid list-none gap-3 p-0 sm:grid-cols-2">
          {data.links.map((link) => {
            const resolved = host.links?.resolve({
              href: link.url,
              kind: link.linkType,
            });
            if (!resolved) return null;
            return (
              <li className="m-0 list-none p-0" key={link.id}>
                <a
                  className="group flex min-w-0 items-center gap-3 rounded-2xl bg-card p-3 transition-[transform,background-color] hover:-translate-y-0.5 hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  href={resolved.href}
                  rel={resolved.external ? "noopener noreferrer" : undefined}
                  target={resolved.external ? "_blank" : undefined}
                >
                  <QuickLinkArtwork host={host} link={link} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">
                      {link.title}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                      {resolved.label ?? destinationLabel(link)}
                    </span>
                  </span>
                  <HugeiconsIcon
                    aria-hidden
                    className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                    icon={ArrowUpRight01Icon}
                  />
                </a>
              </li>
            );
          })}
        </ul>
      </nav>
    );
  },
});

function QuickLinkArtwork({
  host,
  link,
}: {
  host: OpenEditorCustomBlockViewerHost;
  link: QuickLink;
}) {
  const [asset, setAsset] = useState<{ src: string; alt: string } | null>(null);
  const loader = useRef(new QuickLinkAssetLoader());
  const assetId = link.artwork?.kind === "asset" ? link.artwork.assetId : null;
  useEffect(() => {
    loader.current.load(assetId, host, setAsset);
    return () => loader.current.cancel();
  }, [assetId, host]);
  if (link.artwork?.kind === "icon")
    return (
      <span
        aria-hidden
        className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary/10 text-primary"
      >
        {host.icons?.render(link.artwork.id) as ReactNode}
      </span>
    );
  return (
    <span className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary/10 text-primary">
      {asset ? (
        <img
          className="size-full object-cover outline -outline-offset-1 outline-black/10 dark:outline-white/10"
          alt={asset.alt}
          src={asset.src}
        />
      ) : link.linkType === "app" ? (
        <HugeiconsIcon aria-hidden className="size-5" icon={AppWindowIcon} />
      ) : (
        <HugeiconsIcon aria-hidden className="size-5" icon={Link02Icon} />
      )}
    </span>
  );
}

/** Keeps stale or unauthorized managed-asset results out of rendered links. */
export class QuickLinkAssetLoader {
  private generation = 0;

  cancel() {
    this.generation += 1;
  }

  load(
    assetId: string | null,
    host: OpenEditorCustomBlockViewerHost,
    update: (asset: { src: string; alt: string } | null) => void,
  ) {
    const generation = ++this.generation;
    update(null);
    if (!assetId) return;
    void host.assets
      ?.resolve(assetId)
      .then((resolved) => {
        if (generation !== this.generation) return;
        const src = resolved ? host.resolveUrl(resolved.src, "asset") : null;
        update(resolved && src ? { ...resolved, src } : null);
      })
      .catch(() => {
        if (generation === this.generation) update(null);
      });
  }
}

export const baseBlocksCustomBlockViewers = [
  directoryViewer,
  decisionTreeViewer,
  quickLinksViewer,
] as const;
