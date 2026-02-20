"use client";

import { api } from "@baseblocks/backend";
import type { Doc, Id } from "@baseblocks/backend";
import { useMutation, useQuery } from "convex/react";

// Export types for consumers
export type DocumentLibrary = Doc<"documentLibraries">;
export type DocumentFolder = Doc<"documentFolders">;
export type Document = Doc<"documents">;
export type FolderPathItem = { _id: string; name: string };

// Library CRUD operations
export function useDocumentLibrary(siteId: Id<"sites">) {
  const libraries = useQuery(api.documentLibraries.queries.list, { siteId });

  const createLibrary = useMutation(api.documentLibraries.mutations.create);
  const updateLibrary = useMutation(api.documentLibraries.mutations.update);
  const removeLibrary = useMutation(api.documentLibraries.mutations.remove);

  return {
    libraries: libraries as DocumentLibrary[] | undefined,
    isLoading: libraries === undefined,

    create: async (name: string) => {
      return createLibrary({ siteId, name });
    },

    update: async (
      libraryId: Id<"documentLibraries">,
      updates: { name?: string },
    ) => {
      return updateLibrary({ libraryId, ...updates });
    },

    remove: async (libraryId: Id<"documentLibraries">) => {
      return removeLibrary({ libraryId });
    },
  };
}

// Folder operations within a library
export function useFolderOperations(libraryId: Id<"documentLibraries"> | null) {
  const folders = useQuery(
    api.documentFolders.queries.listByLibrary,
    libraryId ? { libraryId } : "skip",
  );

  const createFolder = useMutation(api.documentFolders.mutations.create);
  const updateFolder = useMutation(api.documentFolders.mutations.update);
  const moveFolder = useMutation(api.documentFolders.mutations.move);
  const removeFolder = useMutation(api.documentFolders.mutations.remove);

  return {
    folders: (folders || []) as DocumentFolder[],
    isLoading: folders === undefined,

    create: async (name: string, parentId?: Id<"documentFolders">) => {
      if (!libraryId) throw new Error("No library selected");
      return createFolder({ libraryId, parentId, name });
    },

    rename: async (folderId: Id<"documentFolders">, name: string) => {
      return updateFolder({ folderId, name });
    },

    move: async (
      folderId: Id<"documentFolders">,
      newParentId?: Id<"documentFolders">,
      newOrder?: number,
    ) => {
      return moveFolder({ folderId, newParentId, newOrder });
    },

    remove: async (folderId: Id<"documentFolders">) => {
      return removeFolder({ folderId });
    },
  };
}

// File operations within a library
export function useFileOperations(
  libraryId: Id<"documentLibraries"> | null,
  folderId: Id<"documentFolders"> | null | undefined,
) {
  const files = useQuery(
    api.documents.queries.listByFolder,
    libraryId ? { libraryId, folderId: folderId ?? undefined } : "skip",
  );

  const renameDocument = useMutation(api.documents.mutations.rename);
  const moveDocument = useMutation(api.documents.mutations.move);
  const removeDocument = useMutation(api.documents.mutations.remove);

  return {
    files: (files || []) as Document[],
    isLoading: files === undefined,

    rename: async (documentId: Id<"documents">, filename: string) => {
      return renameDocument({ documentId, filename });
    },

    move: async (
      documentId: Id<"documents">,
      targetFolderId?: Id<"documentFolders">,
    ) => {
      return moveDocument({ documentId, folderId: targetFolderId });
    },

    remove: async (documentId: Id<"documents">) => {
      return removeDocument({ documentId });
    },
  };
}

// Get folder path for breadcrumbs
export function useFolderPath(
  folderId: Id<"documentFolders"> | null,
): FolderPathItem[] {
  const path = useQuery(
    api.documentFolders.queries.getPath,
    folderId ? { folderId } : "skip",
  );

  return (path || []) as FolderPathItem[];
}

// Public view hooks (for renderer)
export function usePublicFolders(
  libraryId: Id<"documentLibraries"> | null,
): DocumentFolder[] {
  const folders = useQuery(
    api.documentFolders.queries.listByLibraryPublic,
    libraryId ? { libraryId } : "skip",
  );
  return (folders || []) as DocumentFolder[];
}

export function usePublicFiles(
  libraryId: Id<"documentLibraries"> | null,
  folderId: Id<"documentFolders"> | null | undefined,
): Document[] {
  const files = useQuery(
    api.documents.queries.listByFolderPublic,
    libraryId ? { libraryId, folderId: folderId ?? undefined } : "skip",
  );
  return (files || []) as Document[];
}

export function usePublicFolderPath(
  folderId: Id<"documentFolders"> | null,
): FolderPathItem[] {
  const path = useQuery(
    api.documentFolders.queries.getPathPublic,
    folderId ? { folderId } : "skip",
  );
  return (path || []) as FolderPathItem[];
}

export function usePublicLibrary(
  libraryId: Id<"documentLibraries"> | null,
): DocumentLibrary | undefined | null {
  return useQuery(
    api.documentLibraries.queries.getPublic,
    libraryId ? { libraryId } : "skip",
  );
}
