"use client";

import { defineOpenEditorCustomBlockViewer } from "@openeditor/custom-block/viewer";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { OpenEditorCustomBlockViewerHost } from "@openeditor/custom-block/viewer";
import type { QuickLink } from "./quick-links";
import { decisionTreeBlock, directoryBlock, quickLinksBlock } from "./index";
import { resolveDecisionTree } from "./decision-tree-navigation";

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
      <section aria-label="Directory">
        {data.directories.length > 1 ? (
          <label>
            Directory
            <select
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
        <label>
          Search
          <input
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(0);
            }}
            type="search"
            value={query}
          />
        </label>
        <table>
          <caption>{active.label}</caption>
          <thead>
            <tr>
              {active.columnIds.map((columnId, index) => (
                <th key={columnId} scope="col">{`Column ${index + 1}`}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => (
              <tr key={row.id}>
                {active.columnIds.map((columnId) => (
                  <td key={columnId}>{row.cells[columnId] ?? ""}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {pages > 1 ? (
          <nav aria-label="Directory pages">
            <button
              disabled={page === 0}
              onClick={() => setPage(page - 1)}
              type="button"
            >
              Previous
            </button>
            <span>{`Page ${page + 1} of ${pages}`}</span>
            <button
              disabled={page + 1 >= pages}
              onClick={() => setPage(page + 1)}
              type="button"
            >
              Next
            </button>
          </nav>
        ) : null}
      </section>
    );
  },
});

export const decisionTreeViewer = defineOpenEditorCustomBlockViewer({
  block: decisionTreeBlock,
  render: function DecisionTreeViewer({ data, host }) {
    const [treeId, setTreeId] = useState(data.trees[0]?.id ?? "");
    const [path, setPath] = useState<string[]>([]);
    const tree = data.trees.find(({ id }) => id === treeId) ?? data.trees[0];
    const state = useMemo(
      () => resolveDecisionTree(tree?.nodes ?? [], path),
      [tree, path],
    );
    if (!tree) return null;
    const Document = host.fields.document;
    return (
      <section aria-label="Decision tree">
        {data.trees.length > 1 ? (
          <select
            aria-label="Decision tree"
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
        <nav aria-label="Decision path">
          <button onClick={() => setPath([])} type="button">
            Root
          </button>
          {state.visibleOptions.map((node) => (
            <button
              key={node.id}
              onClick={() => setPath([...state.path, node.id])}
              type="button"
            >
              {node.name}
            </button>
          ))}
        </nav>
        {state.activeNode ? (
          <aside aria-label={`${state.activeNode.name} context`}>
            <Document
              ariaLabel={`${state.activeNode.name} context`}
              value={state.activeNode.document}
            />
          </aside>
        ) : null}
      </section>
    );
  },
});

export const quickLinksViewer = defineOpenEditorCustomBlockViewer({
  block: quickLinksBlock,
  render: function QuickLinksViewer({ data, host }) {
    return (
      <nav aria-label="Quick links">
        <ul>
          {data.links.map((link) => {
            const resolved = host.links?.resolve({
              href: link.url,
              kind: link.linkType,
            });
            if (!resolved) return null;
            return (
              <li key={link.id}>
                <a
                  href={resolved.href}
                  rel={resolved.external ? "noopener noreferrer" : undefined}
                  target={resolved.external ? "_blank" : undefined}
                >
                  <QuickLinkArtwork host={host} link={link} />
                  {link.title}
                  {resolved.label ? <span>{resolved.label}</span> : null}
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
      <span aria-hidden>
        {host.icons?.render(link.artwork.id) as ReactNode}
      </span>
    );
  return asset ? <img alt={asset.alt} src={asset.src} /> : null;
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
