"use client";

/* oxlint-disable react-doctor/nextjs-no-img-element -- Managed assets are host-resolved private or blob URLs. This framework-neutral package must not depend on the Next.js image pipeline. */

import { defineOpenEditorCustomBlockViewer } from "@openeditor/custom-block/viewer";
import { getDocumentText } from "@openeditor/core";
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  ArrowUpRight01Icon,
  Link02Icon,
  Search01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@baseblocks/ui/button";
import { Input } from "@baseblocks/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@baseblocks/ui/select";
import { useEffect, useMemo, useRef, useState } from "react";
import type { OpenEditorCustomBlockViewerHost } from "@openeditor/custom-block/viewer";
import type { QuickLink } from "./quick-links";
import { decisionTreeBlock, directoryBlock, quickLinksBlock } from "./index";
import {
  previousDecisionTreePath,
  resolveDecisionTree,
} from "./decision-tree-navigation";
import { DecisionTreeState } from "./decision-tree-state";
import { QuickLinkAssetLoader } from "./quick-link-asset-loader";
import { destinationLabel } from "./quick-links";
import { filterDirectoryRows } from "./directory";
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
    const filtered = filterDirectoryRows(active, query);
    const pageSize = active.pageSize ?? Math.max(1, filtered.length);
    const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const visible = filtered.slice(page * pageSize, (page + 1) * pageSize);
    return (
      <BlockShell label="Directory" width={data.width}>
        {data.directories.length > 1 ? (
          <Select
            onValueChange={(value) => {
              setActiveId(value);
              setPage(0);
            }}
            value={active.id}
          >
            <SelectTrigger
              aria-label="Select directory"
              className="max-w-56 rounded-xl"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="start" className="rounded-xl">
              {data.directories.map((directory) => (
                <SelectItem key={directory.id} value={directory.id}>
                  {directory.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
        <div className="relative w-full rounded-2xl">
          <HugeiconsIcon
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            icon={Search01Icon}
          />
          <Input
            aria-label="Search directory"
            className="rounded-2xl border-0 bg-card pl-10 shadow-none dark:bg-card"
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(0);
            }}
            placeholder="Search directory"
            type="search"
            value={query}
          />
        </div>
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full table-fixed text-sm">
            <caption className="sr-only">{active.label}</caption>
            <thead>
              <tr className="border-b border-border/60 bg-muted/30">
                {active.columns.map((column) => (
                  <th
                    className="border-l border-border/60 px-3 py-2 text-left text-xs font-medium text-muted-foreground first:border-l-0"
                    key={column.id}
                    scope="col"
                  >
                    {column.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => (
                <tr
                  className="border-b border-border/50 last:border-0"
                  key={row.id}
                >
                  {active.columns.map(({ id }) => (
                    <td
                      className="whitespace-normal border-l border-border/60 px-3 py-2 align-top first:border-l-0 [overflow-wrap:anywhere]"
                      key={id}
                    >
                      {row.cells[id] ?? ""}
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
    const state = useMemo(
      () => resolveDecisionTree(tree?.nodes ?? [], path),
      [tree, path],
    );
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
        <div className="flex min-h-72 min-w-0 flex-col justify-center overflow-hidden rounded-2xl bg-muted/20 p-4 sm:p-6">
          {state.activeNode ? (
            <h3 className="mb-5 text-balance text-center text-2xl font-semibold leading-tight">
              {getDocumentText(state.activeNode.document) || "Untitled step"}
            </h3>
          ) : null}
          {state.visibleOptions.length > 0 ? (
            <nav aria-label="Decision options" className="grid min-w-0 gap-2">
              {state.visibleOptions.map((node) => (
                <button
                  className="flex min-h-[52px] min-w-0 w-full items-center justify-between gap-3 rounded-2xl bg-card p-3 text-left hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  key={node.id}
                  onClick={() => setPath([...state.path, node.id])}
                  type="button"
                >
                  <span className="min-w-0 break-words text-sm font-medium">
                    {node.name}
                  </span>
                  <HugeiconsIcon
                    aria-hidden
                    className="size-4 shrink-0 text-muted-foreground"
                    icon={ArrowRight01Icon}
                  />
                </button>
              ))}
            </nav>
          ) : (
            <DecisionTreeState
              variant={state.activeNode ? "result" : "preview"}
            />
          )}
          {state.path.length > 1 || path.length > 0 ? (
            <Button
              className="mx-auto mt-5"
              onClick={() => {
                setPath(previousDecisionTreePath(state.path));
              }}
              size="sm"
              type="button"
              variant="ghost"
            >
              <HugeiconsIcon aria-hidden icon={ArrowLeft01Icon} />
              Previous question
            </Button>
          ) : null}
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
              kind: "website",
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
  const assetId = link.imageAssetId ?? null;
  useEffect(() => {
    loader.current.load(assetId, host, setAsset);
    return () => loader.current.cancel();
  }, [assetId, host]);
  return (
    <span className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary/10 text-primary">
      {asset ? (
        <img
          alt={asset.alt}
          className="size-full object-cover"
          src={asset.src}
        />
      ) : (
        <HugeiconsIcon aria-hidden className="size-5" icon={Link02Icon} />
      )}
    </span>
  );
}

export const baseBlocksCustomBlockViewers = [
  directoryViewer,
  decisionTreeViewer,
  quickLinksViewer,
] as const;
