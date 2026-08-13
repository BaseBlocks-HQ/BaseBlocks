"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { CogIcon } from "@hugeicons/core-free-icons";
import { useSiteRenderActions } from "@/components/site-runtime/actions";
import {
  readSearch,
  SearchViewer,
} from "@/features/openeditor/renderers/search";
import { SearchBox } from "@/features/search";
import type { SearchContent } from "@baseblocks/domain";
import { searchBlock } from "@baseblocks/openeditor-contracts/core-blocks";
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
import { defineOpenEditorCustomBlockEditor } from "@openeditor/custom-block/editor";
import { defineOpenEditorCustomBlockViewer } from "@openeditor/custom-block/viewer";

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

function SearchEditor({
  value,
  onChange,
}: {
  value: Required<SearchContent>;
  onChange: (value: Required<SearchContent>) => void;
}) {
  const update = (patch: Partial<SearchContent>) =>
    onChange({ ...value, ...patch });
  return (
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
            <HugeiconsIcon icon={CogIcon} className="size-4" />
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
                onCheckedChange={(checked) => update({ showFileType: checked })}
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </section>
  );
}

export const searchEditor = defineOpenEditorCustomBlockEditor({
  block: searchBlock,
  render: ({ data, updateData }) => (
    <SearchEditor
      value={readSearch(data)}
      onChange={(value) => updateData(value)}
    />
  ),
});

export const searchViewer = defineOpenEditorCustomBlockViewer({
  block: searchBlock,
  render: ({ data }) => <SearchViewer value={readSearch(data)} />,
});
