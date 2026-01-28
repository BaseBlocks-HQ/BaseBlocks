"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "@repo/backend";
import type { Id } from "@repo/backend";

// Document Library CRUD operations
export function useDocumentLibrary(siteId: Id<"sites">) {
  const libraries = useQuery(api.documentLibraries.queries.list, { siteId });

  const createLibrary = useMutation(api.documentLibraries.mutations.create);
  const updateLibrary = useMutation(api.documentLibraries.mutations.update);
  const removeLibrary = useMutation(api.documentLibraries.mutations.remove);

  return {
    libraries,
    isLoading: libraries === undefined,

    create: async (name: string, description?: string, icon?: string) => {
      return createLibrary({ siteId, name, description, icon });
    },

    update: async (
      libraryId: Id<"documentLibraries">,
      updates: { name?: string; description?: string; icon?: string },
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
    folders: folders || [],
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
    files: files || [],
    isLoading: files === undefined,

    rename: async (documentId: Id<"documents">, filename: string) => {
      return renameDocument({ documentId, filename });
    },

    move: async (documentId: Id<"documents">, targetFolderId?: Id<"documentFolders">) => {
      return moveDocument({ documentId, folderId: targetFolderId });
    },

    remove: async (documentId: Id<"documents">) => {
      return removeDocument({ documentId });
    },
  };
}

// Get folder path for breadcrumbs
export function useFolderPath(folderId: Id<"documentFolders"> | null) {
  const path = useQuery(
    api.documentFolders.queries.getPath,
    folderId ? { folderId } : "skip",
  );

  return path || [];
}

// Public view hooks (for renderer)
export function usePublicFolders(
  libraryId: Id<"documentLibraries"> | null,
  accessToken?: string,
) {
  return useQuery(
    api.documentFolders.queries.listByLibraryPublic,
    libraryId ? { libraryId, accessToken } : "skip",
  ) || [];
}

export function usePublicFiles(
  libraryId: Id<"documentLibraries"> | null,
  folderId: Id<"documentFolders"> | null | undefined,
  accessToken?: string,
) {
  return useQuery(
    api.documents.queries.listByFolderPublic,
    libraryId ? { libraryId, folderId: folderId ?? undefined, accessToken } : "skip",
  ) || [];
}

export function usePublicFolderPath(
  folderId: Id<"documentFolders"> | null,
  accessToken?: string,
) {
  return useQuery(
    api.documentFolders.queries.getPathPublic,
    folderId ? { folderId, accessToken } : "skip",
  ) || [];
}

export function usePublicLibrary(
  libraryId: Id<"documentLibraries"> | null,
  accessToken?: string,
) {
  return useQuery(
    api.documentLibraries.queries.getPublic,
    libraryId ? { libraryId, accessToken } : "skip",
  );
}
