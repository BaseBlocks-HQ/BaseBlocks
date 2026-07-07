"use client";

import {
  useAuthenticatedLibraryData,
  useLibraryActions,
} from "@/modules/dashboard/library/data";
import type { LibraryId } from "@/modules/dashboard/library/types";
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
import { LibraryExplorer } from "./library-explorer";

export function LibraryBlockEditor({
  allowDownloads,
  libraryId,
  onLibraryChange,
}: {
  allowDownloads: boolean;
  libraryId: string | undefined;
  onLibraryChange: (libraryId: string) => Promise<void> | void;
}) {
  const { siteId } = useEditorSite();
  const resolvedSiteId = siteId as Id<"sites">;
  const resolvedLibraryId = libraryId ? (libraryId as LibraryId) : null;
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

  const handleCreateLibrary = async () => {
    const name = newLibraryName.trim();
    if (!name) return;
    try {
      const id = await createLibrary({ siteId: resolvedSiteId, name });
      await onLibraryChange(id);
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
            <Select onValueChange={(value) => void onLibraryChange(value)}>
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
