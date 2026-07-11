"use client";

import type { QuicklinkItem } from "@baseblocks/domain";
import {
  defineOpenEditorReactNode,
  NodeViewWrapper,
  type OpenEditorNodeViewProps,
} from "@openeditor/react";
import { ExternalLink, Link2, Plus, Trash2 } from "lucide-react";

function readLinks(value: unknown): QuicklinkItem[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is QuicklinkItem =>
      typeof item === "object" &&
      item !== null &&
      typeof (item as QuicklinkItem).id === "string" &&
      typeof (item as QuicklinkItem).title === "string" &&
      typeof (item as QuicklinkItem).url === "string",
  );
}

function QuickLinksGrid({
  links,
  editable,
  onChange,
}: {
  links: QuicklinkItem[];
  editable: boolean;
  onChange?: (links: QuicklinkItem[]) => void;
}) {
  const update = (id: string, patch: Partial<QuicklinkItem>) => {
    onChange?.(
      links.map((link) => (link.id === id ? { ...link, ...patch } : link)),
    );
  };

  return (
    <section className="my-4 rounded-2xl border bg-card p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Link2 className="size-4" /> Quick Links
        </div>
        {editable ? (
          <button
            className="inline-flex items-center gap-1 rounded-lg border bg-background px-2.5 py-1.5 text-xs hover:bg-muted"
            onClick={() =>
              onChange?.([
                ...links,
                {
                  id: crypto.randomUUID(),
                  title: "New link",
                  url: "https://example.com",
                  linkType: "website",
                },
              ])
            }
            type="button"
          >
            <Plus className="size-3.5" /> Add link
          </button>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {links.map((link) => (
          <article
            className="rounded-xl border bg-background p-3"
            key={link.id}
          >
            <div className="flex gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-sm font-semibold">
                {link.title.slice(0, 1).toUpperCase() || "L"}
              </div>
              <div className="min-w-0 flex-1 space-y-1.5">
                {editable ? (
                  <>
                    <input
                      aria-label="Quick link title"
                      className="w-full bg-transparent text-sm font-medium outline-none"
                      onChange={(event) =>
                        update(link.id, { title: event.target.value })
                      }
                      value={link.title}
                    />
                    <input
                      aria-label="Quick link URL"
                      className="w-full bg-transparent text-xs text-muted-foreground outline-none"
                      onChange={(event) =>
                        update(link.id, { url: event.target.value })
                      }
                      value={link.url}
                    />
                  </>
                ) : (
                  <a className="block min-w-0" href={link.url}>
                    <span className="flex items-center gap-1 text-sm font-medium">
                      {link.title} <ExternalLink className="size-3" />
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {link.url}
                    </span>
                  </a>
                )}
              </div>
              {editable ? (
                <button
                  aria-label={`Remove ${link.title}`}
                  className="self-start rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                  onClick={() =>
                    onChange?.(links.filter((item) => item.id !== link.id))
                  }
                  type="button"
                >
                  <Trash2 className="size-3.5" />
                </button>
              ) : null}
            </div>
          </article>
        ))}
        {links.length === 0 ? (
          <p className="text-xs text-muted-foreground">No quick links yet.</p>
        ) : null}
      </div>
    </section>
  );
}

function QuickLinksNode({
  node,
  updateAttributes,
  editor,
}: OpenEditorNodeViewProps) {
  const links = readLinks(node.attrs.links);
  return (
    <NodeViewWrapper contentEditable={false}>
      <QuickLinksGrid
        editable={editor.isEditable}
        links={links}
        onChange={(nextLinks) => updateAttributes({ links: nextLinks })}
      />
    </NodeViewWrapper>
  );
}

export const quickLinksExtension = defineOpenEditorReactNode({
  block: {
    name: "baseblocks.quickLinks",
    nodeType: "baseblocksQuickLinks",
    label: "Quick Links",
    group: "embed",
    defaultNode: () => ({
      type: "baseblocksQuickLinks",
      attrs: { links: [] },
    }),
    support: { web: "supported", native: "unsupported" },
  },
  node: {
    group: "block",
    atom: true,
    draggable: true,
    addAttributes: () => ({ links: { default: [] } }),
    parseHTML: () => [{ tag: "section[data-baseblocks-quick-links]" }],
    renderHTML: ({ HTMLAttributes }) => [
      "section",
      { ...HTMLAttributes, "data-baseblocks-quick-links": "" },
    ],
  },
  component: QuickLinksNode,
  slashMenu: { keywords: ["links", "cards", "bookmarks", "shortcuts"] },
  viewer: ({ node }) => (
    <QuickLinksGrid editable={false} links={readLinks(node.attrs?.links)} />
  ),
  exporters: {
    html: {
      baseblocksQuickLinks: ({ node, escapeAttribute, escapeHtml }) =>
        readLinks(node.attrs?.links)
          .map(
            (link) =>
              `<a href="${escapeAttribute(link.url)}">${escapeHtml(link.title)}</a>`,
          )
          .join("\n"),
    },
    text: {
      baseblocksQuickLinks: ({ node }) =>
        readLinks(node.attrs?.links)
          .map((link) => `${link.title}: ${link.url}`)
          .join("\n"),
    },
  },
});
