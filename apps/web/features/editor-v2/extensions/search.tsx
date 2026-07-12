"use client";

import { useSiteRenderActions } from "@/components/site-runtime/actions";
import { SearchBox } from "@/features/search";
import type { SearchContent } from "@baseblocks/domain";
import { Input } from "@baseblocks/ui/input";
import { Switch } from "@baseblocks/ui/switch";
import {
  defineOpenEditorReactNode,
  NodeViewWrapper,
  type OpenEditorNodeViewProps,
} from "@openeditor/react";

const defaults: Required<SearchContent> = {
  placeholder: "Search documents…",
  maxResults: 10,
  showFileType: true,
};

function readSearch(value: unknown): Required<SearchContent> {
  const candidate =
    value && typeof value === "object" ? (value as SearchContent) : {};
  return {
    placeholder: candidate.placeholder || defaults.placeholder,
    maxResults: Math.min(
      50,
      Math.max(1, candidate.maxResults ?? defaults.maxResults),
    ),
    showFileType: candidate.showFileType ?? defaults.showFileType,
  };
}

function SearchPreview({ value }: { value: Required<SearchContent> }) {
  const { siteId } = useSiteRenderActions();
  if (!siteId) {
    return (
      <p className="rounded-lg border p-4 text-sm text-muted-foreground">
        Search preview is unavailable outside a site.
      </p>
    );
  }
  return (
    <SearchBox
      maxResults={value.maxResults}
      placeholder={value.placeholder}
      showFileType={value.showFileType}
      siteId={siteId}
      usePublicQuery={false}
    />
  );
}

function SearchViewer({ value }: { value: Required<SearchContent> }) {
  const actions = useSiteRenderActions();
  if (!actions.siteId)
    return (
      <p className="my-4 rounded-lg border p-4 text-sm text-muted-foreground">
        Search is unavailable outside a site.
      </p>
    );
  return (
    <SearchBox
      maxResults={value.maxResults}
      onOpenPageResult={(pageId, searchTerm) =>
        actions.openPage?.(pageId, { searchTerm })
      }
      placeholder={value.placeholder}
      showFileType={value.showFileType}
      siteId={actions.siteId}
      usePublicQuery={actions.publicSearch === true}
    />
  );
}

function SearchNode({ node, updateAttributes }: OpenEditorNodeViewProps) {
  const value = readSearch(node.attrs.search);
  const update = (patch: Partial<SearchContent>) =>
    updateAttributes({ search: { ...value, ...patch } });
  return (
    <NodeViewWrapper contentEditable={false}>
      <section className="not-prose my-4 space-y-3 rounded-xl border bg-background p-4">
        <div className="grid gap-3 sm:grid-cols-[1fr_8rem_auto]">
          <Input
            aria-label="Search placeholder"
            onChange={(event) => update({ placeholder: event.target.value })}
            value={value.placeholder}
          />
          <Input
            aria-label="Maximum search results"
            max={50}
            min={1}
            onChange={(event) =>
              update({ maxResults: Number(event.target.value) })
            }
            type="number"
            value={value.maxResults}
          />
          <div className="flex items-center gap-2 text-sm">
            <Switch
              checked={value.showFileType}
              onCheckedChange={(checked) => update({ showFileType: checked })}
            />
            File types
          </div>
        </div>
        <SearchPreview value={value} />
      </section>
    </NodeViewWrapper>
  );
}

export const searchExtension = defineOpenEditorReactNode({
  block: {
    name: "baseblocks.search",
    nodeType: "baseblocksSearch",
    label: "Search",
    group: "embed",
    defaultNode: () => ({
      type: "baseblocksSearch",
      attrs: { search: defaults },
    }),
    support: { web: "supported", native: "unsupported" },
  },
  node: {
    group: "block",
    atom: true,
    draggable: true,
    addAttributes: () => ({ search: { default: defaults } }),
    parseHTML: () => [{ tag: "section[data-baseblocks-search]" }],
    renderHTML: ({ HTMLAttributes }) => [
      "section",
      { ...HTMLAttributes, "data-baseblocks-search": "" },
    ],
  },
  component: SearchNode,
  slashMenu: { keywords: ["find", "query", "documents"] },
  viewer: ({ node }) => <SearchViewer value={readSearch(node.attrs?.search)} />,
  exporters: {
    html: {
      baseblocksSearch: ({ node, escapeAttribute }) =>
        `<div data-baseblocks-search data-placeholder="${escapeAttribute(readSearch(node.attrs?.search).placeholder)}"></div>`,
    },
    text: { baseblocksSearch: () => "[Site search]" },
  },
});
