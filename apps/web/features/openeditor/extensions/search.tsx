"use client";

import { useSiteRenderActions } from "@/components/site-runtime/actions";
import {
  readSearch,
  SearchViewer,
} from "@/features/openeditor/renderers/search";
import { SearchBox } from "@/features/search";
import type { SearchContent } from "@baseblocks/domain";
import { searchBlock } from "@baseblocks/openeditor-contracts/core-blocks";
import { Input } from "@baseblocks/ui/input";
import { Label } from "@baseblocks/ui/label";
import { Switch } from "@baseblocks/ui/switch";
import { defineOpenEditorCustomBlockEditor } from "@openeditor/custom-block/editor";
import { defineOpenEditorCustomBlockViewer } from "@openeditor/custom-block/viewer";
import { useId } from "react";

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

export function SearchSettings({
  value,
  onChange,
}: {
  value: Required<SearchContent>;
  onChange: (value: Required<SearchContent>) => void;
}) {
  const placeholderId = useId();
  const maxResultsId = useId();
  const fileTypesId = useId();
  const update = (patch: Partial<SearchContent>) =>
    onChange({ ...value, ...patch });
  return (
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
  );
}

export const searchEditor = defineOpenEditorCustomBlockEditor({
  block: searchBlock,
  render: ({ data }) => (
    <section className="not-prose my-4">
      <SearchPreview value={readSearch(data)} />
    </section>
  ),
});

export const searchViewer = defineOpenEditorCustomBlockViewer({
  block: searchBlock,
  render: ({ data }) => <SearchViewer value={readSearch(data)} />,
});
