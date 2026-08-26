"use client";

import { LibrarySettings } from "@/features/openeditor/extensions/library";
import { SearchSettings } from "@/features/openeditor/extensions/search";
import { directoryBlock } from "@baseblocks/custom-blocks";
import {
  libraryBlock,
  searchBlock,
} from "@baseblocks/openeditor-contracts/core-blocks";
import { Label } from "@baseblocks/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@baseblocks/ui/select";
import { CogIcon } from "@hugeicons/core-free-icons";
import {
  type OpenEditorBlockPanelProps,
  useOpenEditorBlockTarget,
} from "@openeditor/react";

const pageSizes = [5, 10, 20, 50] as const;

function DirectorySettingsPanel({ target }: OpenEditorBlockPanelProps) {
  const block = useOpenEditorBlockTarget(target);
  if (!block) return null;
  const value = directoryBlock.parseData(block.attributes.data);
  const update = (next: typeof value) =>
    target.commands.updateAttributes({ data: next });
  const updatePageSize = (directoryId: string, pageSize: number | null) =>
    update({
      ...value,
      directories: value.directories.map((directory) =>
        directory.id === directoryId ? { ...directory, pageSize } : directory,
      ),
    });

  return (
    <div className="w-72 p-4">
      <h2 className="mb-4 font-medium text-sm">Directory settings</h2>
      <div className="grid gap-4">
        <div className="grid gap-1.5">
          <Label
            className="text-xs font-medium tracking-wide text-sidebar-foreground/55"
            htmlFor="directory-width"
          >
            Width
          </Label>
          <Select
            onValueChange={(next) =>
              update({
                ...value,
                width: next === "full" ? "full" : "default",
              })
            }
            value={value.width === "full" ? "full" : "default"}
          >
            <SelectTrigger
              className="h-10 w-full rounded-[0.95rem] border-sidebar-border/80 bg-background/70 text-sidebar-foreground"
              id="directory-width"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-[1rem] border-sidebar-border bg-sidebar text-sidebar-foreground shadow-2xl">
              <SelectItem value="default">Content width</SelectItem>
              <SelectItem value="full">Full width</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {value.directories.map((directory) => {
          const id = `directory-page-size-${directory.id}`;
          return (
            <div className="grid gap-1.5" key={directory.id}>
              <Label
                className="text-xs font-medium tracking-wide text-sidebar-foreground/55"
                htmlFor={id}
              >
                {value.directories.length > 1
                  ? `${directory.label} rows displayed`
                  : "Rows displayed"}
              </Label>
              <Select
                onValueChange={(next) =>
                  updatePageSize(
                    directory.id,
                    next === "all" ? null : Number(next),
                  )
                }
                value={
                  directory.pageSize === null
                    ? "all"
                    : String(directory.pageSize)
                }
              >
                <SelectTrigger
                  className="h-10 w-full rounded-[0.95rem] border-sidebar-border/80 bg-background/70 text-sidebar-foreground"
                  id={id}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-[1rem] border-sidebar-border bg-sidebar text-sidebar-foreground shadow-2xl">
                  <SelectItem value="all">Show all rows</SelectItem>
                  {pageSizes.map((size) => (
                    <SelectItem key={size} value={String(size)}>
                      {size} rows per page
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LibrarySettingsPanel({ close, target }: OpenEditorBlockPanelProps) {
  const block = useOpenEditorBlockTarget(target);
  if (!block) return null;
  const value = libraryBlock.parseData(block.attributes.data);
  return (
    <div className="w-80 p-4">
      <h2 className="mb-4 font-medium text-sm">Library settings</h2>
      <LibrarySettings
        onChange={(data) => target.commands.updateAttributes({ data })}
        onComplete={close}
        value={value}
      />
    </div>
  );
}

function SearchSettingsPanel({ target }: OpenEditorBlockPanelProps) {
  const block = useOpenEditorBlockTarget(target);
  if (!block) return null;
  const value = searchBlock.parseData(block.attributes.data);
  return (
    <div className="w-72 p-4">
      <h2 className="mb-4 font-medium text-sm">Search settings</h2>
      <SearchSettings
        onChange={(data) => target.commands.updateAttributes({ data })}
        value={value}
      />
    </div>
  );
}

const configuredBlock =
  (blockId: string) =>
  ({ block }: { block: { attributes: Readonly<Record<string, unknown>> } }) =>
    block.attributes.blockId === blockId;

export const baseBlocksCustomBlockMenuExtension = {
  block: { name: "baseblocks-custom-blocks", nodeType: "customBlock" },
  blockMenu: {
    items: [
      {
        type: "panel" as const,
        id: "configure-directory",
        label: "Configure",
        icon: CogIcon,
        section: "configure" as const,
        when: configuredBlock(directoryBlock.id),
        panel: DirectorySettingsPanel,
      },
      {
        type: "panel" as const,
        id: "configure-library",
        label: "Configure",
        icon: CogIcon,
        section: "configure" as const,
        when: configuredBlock(libraryBlock.id),
        panel: LibrarySettingsPanel,
      },
      {
        type: "panel" as const,
        id: "configure-search",
        label: "Configure",
        icon: CogIcon,
        section: "configure" as const,
        when: configuredBlock(searchBlock.id),
        panel: SearchSettingsPanel,
      },
    ],
  },
};
