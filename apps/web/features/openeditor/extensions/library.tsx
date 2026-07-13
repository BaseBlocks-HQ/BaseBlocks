"use client";

import { baseBlocksSlashMenuOrder } from "@/features/openeditor/slash-menu";
import {
  PublicLibraryViewer,
  readLibrary,
} from "@/features/openeditor/renderers/library";
import { LibraryExplorer } from "@/features/libraries/components/library-explorer";
import type { LibraryId } from "@/features/libraries/tree-input";
import { useSiteRenderActions } from "@/components/site-runtime/actions";
import { api } from "@baseblocks/backend";
import type { LibraryContent } from "@baseblocks/domain";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@baseblocks/ui/select";
import { Switch } from "@baseblocks/ui/switch";
import {
  defineOpenEditorReactNode,
  NodeViewWrapper,
  type OpenEditorNodeViewProps,
} from "@openeditor/react";
import { useMutation, useQuery } from "convex/react";
import { FolderPlus, LibraryBig, Plus, Settings } from "lucide-react";
import { useState } from "react";

function LibraryEditor({
  value,
  onChange,
}: {
  value: LibraryContent;
  onChange: (value: LibraryContent) => void;
}) {
  const { siteId } = useSiteRenderActions();
  const createLibrary = useMutation(api.libraries.createLibrary);
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const libraries = useQuery(
    api.libraries.listLibraries,
    siteId ? { siteId } : "skip",
  );
  const libraryId = value.libraryId as LibraryId | undefined;
  const explorer = useQuery(
    api.libraries.getExplorer,
    libraryId ? { libraryId } : "skip",
  );

  const create = async () => {
    const name = newName.trim();
    if (!name || !siteId || creating) return;
    setCreating(true);
    setError(null);
    try {
      const nextLibraryId = await createLibrary({ siteId, name });
      onChange({ ...value, libraryId: nextLibraryId });
      setNewName("");
      setOpen(false);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not create library.",
      );
    } finally {
      setCreating(false);
    }
  };

  if (!siteId) {
    return (
      <p className="text-sm text-muted-foreground">
        Library editing is unavailable outside a site.
      </p>
    );
  }

  return (
    <div className="flex items-start gap-2">
      <div className="min-w-0 flex-1">
        {libraryId ? (
          <LibraryExplorer
            allowDownloads={value.allowDownloads !== false}
            embedded
            explorer={explorer}
          />
        ) : (
          <button
            className="flex min-h-20 w-full items-center justify-center gap-2 rounded-2xl border border-dashed text-sm font-medium text-muted-foreground transition hover:border-primary/40 hover:bg-primary/5 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => setOpen(true)}
            type="button"
          >
            <FolderPlus className="size-4" />
            Choose or create a library
          </button>
        )}
      </div>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            aria-label="Configure library"
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
          className="w-80 rounded-[1.25rem] border-sidebar-border bg-sidebar p-4 text-sidebar-foreground shadow-2xl"
        >
          <PopoverHeader className="mb-4">
            <PopoverTitle>Library settings</PopoverTitle>
          </PopoverHeader>
          <div className="grid gap-4">
            <div className="grid gap-1.5">
              <Label className="text-xs font-medium tracking-wide text-sidebar-foreground/55">
                Library
              </Label>
              <Select
                onValueChange={(next) =>
                  onChange({ ...value, libraryId: next })
                }
                value={libraryId}
              >
                <SelectTrigger className="h-10 w-full rounded-[0.95rem] border-sidebar-border/80 bg-background/70 text-sidebar-foreground">
                  <SelectValue placeholder="Choose a library" />
                </SelectTrigger>
                <SelectContent className="rounded-[1rem] border-sidebar-border bg-sidebar text-sidebar-foreground shadow-2xl">
                  {libraries?.map((library) => (
                    <SelectItem
                      className="rounded-[0.7rem] focus:bg-sidebar-accent focus:text-sidebar-accent-foreground"
                      key={library._id}
                      value={library._id}
                    >
                      {library.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-1.5">
              <Label
                className="text-xs font-medium tracking-wide text-sidebar-foreground/55"
                htmlFor="new-library-name"
              >
                New library
              </Label>
              <div className="flex gap-2">
                <Input
                  className="h-10 rounded-[0.95rem] border-sidebar-border/80 bg-background/70 text-sidebar-foreground"
                  id="new-library-name"
                  onChange={(event) => {
                    setNewName(event.target.value);
                    setError(null);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") void create();
                  }}
                  placeholder="Library name"
                  value={newName}
                />
                <Button
                  aria-label="Create library"
                  className="size-10 shrink-0 rounded-full"
                  disabled={!newName.trim() || creating}
                  onClick={() => void create()}
                  size="icon"
                  type="button"
                >
                  <Plus className="size-4" />
                </Button>
              </div>
              {error ? (
                <p className="text-xs text-destructive">{error}</p>
              ) : null}
            </div>

            <div className="flex items-center justify-between gap-4">
              <Label className="text-sm" htmlFor="library-downloads">
                Allow downloads
              </Label>
              <Switch
                checked={value.allowDownloads !== false}
                id="library-downloads"
                onCheckedChange={(allowDownloads) =>
                  onChange({ ...value, allowDownloads })
                }
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

function LibraryNode({ node, updateAttributes }: OpenEditorNodeViewProps) {
  const value = readLibrary(node.attrs.library);
  return (
    <NodeViewWrapper contentEditable={false}>
      <section className="not-prose my-4">
        <LibraryEditor
          onChange={(library) => updateAttributes({ library })}
          value={value}
        />
      </section>
    </NodeViewWrapper>
  );
}

export const libraryExtension = defineOpenEditorReactNode({
  block: {
    name: "baseblocks.library",
    nodeType: "baseblocksLibrary",
    label: "Library",
    group: "embed",
    defaultNode: () => ({
      type: "baseblocksLibrary",
      attrs: { library: { allowDownloads: true } },
    }),
    support: { web: "supported", native: "unsupported" },
  },
  node: {
    group: "block",
    atom: true,
    draggable: true,
    addAttributes: () => ({ library: { default: { allowDownloads: true } } }),
    parseHTML: () => [{ tag: "section[data-baseblocks-library]" }],
    renderHTML: ({ HTMLAttributes }) => [
      "section",
      { ...HTMLAttributes, "data-baseblocks-library": "" },
    ],
  },
  component: LibraryNode,
  slashMenu: {
    icon: LibraryBig,
    keywords: ["documents", "files", "folder"],
    order: baseBlocksSlashMenuOrder.library,
  },
  viewer: ({ node }) => (
    <PublicLibraryViewer value={readLibrary(node.attrs?.library)} />
  ),
  exporters: {
    html: {
      baseblocksLibrary: ({ node, escapeAttribute }) => {
        const value = readLibrary(node.attrs?.library);
        return `<div data-baseblocks-library="${escapeAttribute(value.libraryId ?? "")}" data-allow-downloads="${value.allowDownloads !== false}"></div>`;
      },
    },
    text: { baseblocksLibrary: () => "[Document library]" },
  },
});
