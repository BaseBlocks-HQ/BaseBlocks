"use client";

import { getStoredAccessSessionTokens } from "@/features/published-sites/access-session";
import { LibraryExplorer } from "@/features/libraries/components/library-explorer";
import type { LibraryId } from "@/features/libraries/tree-input";
import type { ElementEditorProps } from "@/components/site-elements/registry";
import { useEditorSite } from "@/features/editor/editor-state";
import { api } from "@baseblocks/backend";
import type { Id } from "@baseblocks/backend";
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
import { useMutation, useQuery } from "convex/react";
import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type {
  ElementConfigPanelProps,
  ElementRendererProps,
} from "@/components/site-elements/registry";

export function LibraryEditor({
  content,
  onUpdate,
}: ElementEditorProps<"library">) {
  const { siteId } = useEditorSite();
  const resolvedSiteId = siteId as Id<"sites">;
  const resolvedLibraryId = content.libraryId
    ? (content.libraryId as LibraryId)
    : null;
  const libraries = useQuery(api.libraries.listLibraries, {
    siteId: resolvedSiteId,
  });
  const createLibrary = useMutation(api.libraries.createLibrary);
  const [newLibraryName, setNewLibraryName] = useState("");
  const explorer = useQuery(
    api.libraries.getExplorer,
    resolvedLibraryId ? { libraryId: resolvedLibraryId } : "skip",
  );
  const allowDownloads = content.allowDownloads !== false;

  const selectLibrary = (libraryId: string) =>
    onUpdate({ ...content, libraryId });

  const handleCreateLibrary = async () => {
    const name = newLibraryName.trim();
    if (!name) return;

    try {
      const libraryId = await createLibrary({ siteId: resolvedSiteId, name });
      selectLibrary(libraryId);
      setNewLibraryName("");
      toast.success("Library created");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create library",
      );
    }
  };

  if (!resolvedLibraryId) {
    return (
      <div className="rounded-lg border bg-background p-4">
        <div className="mx-auto max-w-md space-y-3">
          <p className="text-center text-sm font-medium">Select a library</p>
          {libraries && libraries.length > 0 ? (
            <Select onValueChange={selectLibrary}>
              <SelectTrigger>
                <SelectValue placeholder="Choose library" />
              </SelectTrigger>
              <SelectContent>
                {libraries.map((library) => (
                  <SelectItem key={library._id} value={library._id}>
                    {library.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
          <div className="flex min-w-0 gap-2">
            <Input
              value={newLibraryName}
              onChange={(event) => setNewLibraryName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void handleCreateLibrary();
              }}
              placeholder="New library name"
            />
            <Button
              size="icon"
              onClick={() => void handleCreateLibrary()}
              disabled={!newLibraryName.trim()}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <LibraryExplorer
      access="manage"
      allowDownloads={allowDownloads}
      embedded
      explorer={explorer}
    />
  );
}

export function LibraryRenderer({ content }: ElementRendererProps<"library">) {
  const resolvedLibraryId = content.libraryId
    ? (content.libraryId as LibraryId)
    : null;
  const sessionTokens = getStoredAccessSessionTokens();
  const explorer = useQuery(
    api.libraries.getPublicExplorer,
    resolvedLibraryId
      ? { libraryId: resolvedLibraryId, sessionTokens }
      : "skip",
  );

  if (!resolvedLibraryId) {
    return (
      <div className="rounded-lg border bg-background p-6 text-center text-sm text-muted-foreground">
        No library configured
      </div>
    );
  }

  return (
    <LibraryExplorer
      access="read"
      allowDownloads={content.allowDownloads !== false}
      embedded
      explorer={explorer}
    />
  );
}

export function LibraryConfigPanel({
  content,
  onUpdate,
}: ElementConfigPanelProps<"library">) {
  return (
    <div className="space-y-4">
      <h4 className="font-medium text-sm">Library Settings</h4>

      <div className="flex items-center justify-between">
        <div>
          <Label htmlFor="allow-downloads" className="text-sm">
            Allow downloads
          </Label>
          <p className="text-xs text-muted-foreground">
            Affects published view
          </p>
        </div>
        <Switch
          id="allow-downloads"
          checked={content.allowDownloads !== false}
          onCheckedChange={(checked) =>
            onUpdate({ ...content, allowDownloads: checked })
          }
        />
      </div>
    </div>
  );
}
