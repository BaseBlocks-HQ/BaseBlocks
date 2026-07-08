"use client";

import {
  useAuthenticatedLibraryData,
  useLibraryActions,
} from "@/modules/document-library/hooks";
import type { LibraryId } from "@/modules/document-library/types";
import { LibraryExplorer } from "@/modules/document-library/components/library-explorer";
import type { ElementEditorProps } from "@/modules/site-elements/authoring/registry";
import { useEditorSite } from "@/modules/editor/state";
import { api } from "@baseblocks/backend";
import type { Id } from "@baseblocks/backend";
import { Button } from "@baseblocks/ui/button";
import { Input } from "@baseblocks/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@baseblocks/ui/select";
import { useMutation, useQuery } from "convex/react";
import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export function LibraryEditor({
  content,
  onUpdate,
}: ElementEditorProps<"library">) {
  const { siteId } = useEditorSite();
  const resolvedSiteId = siteId as Id<"sites">;
  const resolvedLibraryId = content.libraryId
    ? (content.libraryId as LibraryId)
    : null;
  const libraries = useQuery(api.documentLibraries.queries.list, {
    siteId: resolvedSiteId,
  });
  const createLibrary = useMutation(api.documentLibraries.mutations.create);
  const [newLibraryName, setNewLibraryName] = useState("");
  const data = useAuthenticatedLibraryData(resolvedLibraryId);
  const actions = useLibraryActions({
    libraryId: resolvedLibraryId,
    siteId: resolvedSiteId,
  });
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
      data={data}
      actions={actions}
      uploadState={actions}
      options={{
        access: "manage",
        allowDownloads,
        embedded: true,
      }}
    />
  );
}
