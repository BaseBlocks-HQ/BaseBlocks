"use client";

import { CogIcon, Search01Icon } from "@hugeicons/core-free-icons";
import { useSiteRenderActions } from "@/components/site-runtime/actions";
import {
  baseBlocksSlashMenuOrder,
  createOpenEditorIcon,
} from "@/features/openeditor/slash-menu";
import {
  readSearch,
  SearchViewer,
} from "@/features/openeditor/renderers/search";
import { SearchBox } from "@/features/search";
import type { SearchContent } from "@baseblocks/domain";
import { searchDefinition } from "@baseblocks/openeditor-contracts";
import { Input } from "@baseblocks/ui/input";
import { Label } from "@baseblocks/ui/label";
import { Switch } from "@baseblocks/ui/switch";
import {
  defineOpenEditorReactNode,
  NodeViewWrapper,
  type OpenEditorBlockPanelProps,
  type OpenEditorNodeViewProps,
  useOpenEditorBlockTarget,
} from "@openeditor/react";
import { useId } from "react";

const SearchMenuIcon = createOpenEditorIcon(Search01Icon);

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
      publishedMode={false}
    />
  );
}

function SearchNode({ node }: OpenEditorNodeViewProps) {
  const value = readSearch(node.attrs.search);
  return (
    <NodeViewWrapper contentEditable={false}>
      <section className="not-prose my-4">
        <SearchPreview value={value} />
      </section>
    </NodeViewWrapper>
  );
}

function SearchSettingsPanel({ target }: OpenEditorBlockPanelProps) {
  const block = useOpenEditorBlockTarget(target);
  const placeholderId = useId();
  const maxResultsId = useId();
  const fileTypesId = useId();
  if (!block) return null;
  const value = readSearch(block.attributes.search);
  const update = (patch: Partial<SearchContent>) =>
    target.commands.updateAttributes({ search: { ...value, ...patch } });

  return (
    <div className="w-72 p-4">
      <h2 className="mb-4 font-medium text-sm">Search settings</h2>
      <div className="grid gap-4">
        <Label
          className="grid gap-1.5 text-xs font-medium tracking-wide text-sidebar-foreground/55"
          htmlFor={placeholderId}
        >
          Placeholder
          <Input
            className="h-9 rounded-[0.85rem] border-sidebar-border/80 bg-background/70 text-sidebar-foreground"
            id={placeholderId}
            onChange={(event) => update({ placeholder: event.target.value })}
            value={value.placeholder}
          />
        </Label>
        <Label
          className="grid gap-1.5 text-xs font-medium tracking-wide text-sidebar-foreground/55"
          htmlFor={maxResultsId}
        >
          Maximum results
          <Input
            className="h-9 rounded-[0.85rem] border-sidebar-border/80 bg-background/70 text-sidebar-foreground"
            id={maxResultsId}
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
          <Label className="text-sm" htmlFor={fileTypesId}>
            Show file types
          </Label>
          <Switch
            checked={value.showFileType}
            id={fileTypesId}
            onCheckedChange={(checked) => update({ showFileType: checked })}
          />
        </div>
      </div>
    </div>
  );
}

export const searchExtension = defineOpenEditorReactNode({
  definition: searchDefinition,
  component: SearchNode,
  blockMenu: {
    configure: {
      icon: CogIcon,
      panel: SearchSettingsPanel,
    },
  },
  insertMenu: {
    icon: SearchMenuIcon,
    keywords: ["find", "query", "documents"],
    order: baseBlocksSlashMenuOrder.search,
  },
  viewer: ({ node }) => <SearchViewer value={readSearch(node.attrs?.search)} />,
  exporters: {
    html: {
      baseblocksSearch: ({ node, escapeAttribute }) =>
        `<div data-baseblocks-search data-placeholder="${escapeAttribute(readSearch(node.attrs?.search).placeholder)}"></div>`,
    },
    text: { baseblocksSearch: () => "[Site search]" },
  },
});
