"use client";

import { useSiteRenderActions } from "@/components/site-runtime/actions";
import { SearchBox } from "@/features/search";
import type { SearchContent } from "@baseblocks/domain";
import { Button } from "@baseblocks/ui/button";
import { Input } from "@baseblocks/ui/input";
import { Label } from "@baseblocks/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@baseblocks/ui/popover";
import { Switch } from "@baseblocks/ui/switch";
import {
  defineOpenEditorReactNode,
  NodeViewWrapper,
  type OpenEditorNodeViewProps,
} from "@openeditor/react";
import { Settings } from "lucide-react";

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
      surface="soft"
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
      surface="soft"
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
      <section className="not-prose my-4 flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <SearchPreview value={value} />
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              aria-label="Configure search"
              className="shrink-0 rounded-2xl border-0 bg-card shadow-none hover:bg-muted/60"
              size="icon"
              type="button"
              variant="ghost"
            >
              <Settings className="size-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="end"
            className="w-72 rounded-[1.25rem] border-sidebar-border bg-sidebar p-4 text-sidebar-foreground shadow-2xl"
          >
            <PopoverHeader className="mb-4">
              <PopoverTitle>Search settings</PopoverTitle>
            </PopoverHeader>
            <div className="grid gap-4">
              <Label
                className="grid gap-1.5 text-xs font-medium tracking-wide text-sidebar-foreground/55"
                htmlFor="search-placeholder"
              >
                Placeholder
                <Input
                  className="h-9 rounded-[0.85rem] border-sidebar-border/80 bg-background/70 text-sidebar-foreground"
                  id="search-placeholder"
                  onChange={(event) =>
                    update({ placeholder: event.target.value })
                  }
                  value={value.placeholder}
                />
              </Label>
              <Label
                className="grid gap-1.5 text-xs font-medium tracking-wide text-sidebar-foreground/55"
                htmlFor="search-max-results"
              >
                Maximum results
                <Input
                  className="h-9 rounded-[0.85rem] border-sidebar-border/80 bg-background/70 text-sidebar-foreground"
                  id="search-max-results"
                  max={50}
                  min={1}
                  onChange={(event) =>
                    update({ maxResults: Number(event.target.value) })
                  }
                  type="number"
                  value={value.maxResults}
                />
              </Label>
              <div className="flex items-center justify-between gap-4">
                <Label className="text-sm" htmlFor="search-file-types">
                  Show file types
                </Label>
                <Switch
                  checked={value.showFileType}
                  id="search-file-types"
                  onCheckedChange={(checked) =>
                    update({ showFileType: checked })
                  }
                />
              </div>
            </div>
          </PopoverContent>
        </Popover>
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
