"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon, FolderAddIcon } from "@hugeicons/core-free-icons";
import {
  PublicLibraryViewer,
  readLibrary,
} from "@/features/openeditor/renderers/library";
import { LibraryExplorer } from "@/features/libraries/library-explorer";
import type { LibraryId } from "@/features/libraries/model";
import { useSiteRenderActions } from "@/components/site-runtime/actions";
import { api } from "@baseblocks/backend";
import type { LibraryContent } from "@baseblocks/domain";
import { libraryBlock } from "@baseblocks/openeditor-contracts/core-blocks";
import { Button } from "@baseblocks/ui/button";
import { Input } from "@baseblocks/ui/input";
import { Label } from "@baseblocks/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@baseblocks/ui/select";
import { Switch } from "@baseblocks/ui/switch";
import { defineOpenEditorCustomBlockEditor } from "@openeditor/custom-block/editor";
import { defineOpenEditorCustomBlockViewer } from "@openeditor/custom-block/viewer";
import { useMutation, useQuery } from "convex/react";
import { useId, useState } from "react";

export function LibrarySettings({
  onComplete,
  value,
  onChange,
}: {
  onComplete?: () => void;
  value: LibraryContent;
  onChange: (value: LibraryContent) => void;
}) {
  const { siteId } = useSiteRenderActions();
  const createLibrary = useMutation(api.libraries.createLibrary);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const newLibraryNameId = useId();
  const allowDownloadsId = useId();
  const libraries = useQuery(
    api.libraries.listLibraries,
    siteId ? { siteId } : "skip",
  );
  const libraryId = value.libraryId as LibraryId | undefined;
  const create = async () => {
    const name = newName.trim();
    if (!name || !siteId || creating) return;
    setCreating(true);
    setError(null);
    try {
      const nextLibraryId = await createLibrary({ siteId, name });
      onChange({ ...value, libraryId: nextLibraryId });
      setNewName("");
      onComplete?.();
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
    <div className="grid gap-4">
      <div className="grid gap-1.5">
        <Label className="text-xs font-medium tracking-wide text-sidebar-foreground/55">
          Library
        </Label>
        <Select
          onValueChange={(next) => onChange({ ...value, libraryId: next })}
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
          htmlFor={newLibraryNameId}
        >
          New library
        </Label>
        <div className="flex gap-2">
          <Input
            className="h-10 rounded-[0.95rem] border-sidebar-border/80 bg-background/70 text-sidebar-foreground"
            id={newLibraryNameId}
            onChange={(event) => {
              setNewName(event.target.value);
              setError(null);
            }}
            onKeyDown={(event) => {
              if (event.nativeEvent.isComposing) return;
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
            <HugeiconsIcon icon={Add01Icon} className="size-4" />
          </Button>
        </div>
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
      </div>

      <div className="flex items-center justify-between gap-4">
        <Label className="text-sm" htmlFor={allowDownloadsId}>
          Allow downloads
        </Label>
        <Switch
          checked={value.allowDownloads !== false}
          id={allowDownloadsId}
          onCheckedChange={(allowDownloads) =>
            onChange({ ...value, allowDownloads })
          }
        />
      </div>
    </div>
  );
}

function LibraryEditor({
  onChange,
  value,
}: {
  onChange: (value: LibraryContent) => void;
  value: LibraryContent;
}) {
  const { siteId } = useSiteRenderActions();
  const libraryId = value.libraryId as LibraryId | undefined;
  const explorer = useQuery(
    api.libraries.getExplorer,
    libraryId ? { libraryId } : "skip",
  );
  if (!siteId) {
    return (
      <p className="text-sm text-muted-foreground">
        Library editing is unavailable outside a site.
      </p>
    );
  }
  return libraryId ? (
    <LibraryExplorer
      allowDownloads={value.allowDownloads !== false}
      embedded
      explorer={explorer}
    />
  ) : (
    <div className="rounded-2xl border border-dashed p-4">
      <div className="mb-4 flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <HugeiconsIcon icon={FolderAddIcon} className="size-4" />
        Choose or create a library
      </div>
      <LibrarySettings onChange={onChange} value={value} />
    </div>
  );
}

export const libraryEditor = defineOpenEditorCustomBlockEditor({
  block: libraryBlock,
  render: ({ data, updateData }) => (
    <section className="not-prose my-4">
      <LibraryEditor
        onChange={({ allowDownloads, libraryId }) =>
          updateData({
            ...(libraryId ? { libraryId } : {}),
            allowDownloads: allowDownloads !== false,
          })
        }
        value={readLibrary(data)}
      />
    </section>
  ),
});

export const libraryViewer = defineOpenEditorCustomBlockViewer({
  block: libraryBlock,
  render: ({ data }) => <PublicLibraryViewer value={readLibrary(data)} />,
});
