"use client";

import { getStoredAccessSessionTokens } from "@/lib/public-site/access-session";
import { useFileUpload } from "@/lib/storage/hooks";
import { api } from "@baseblocks/backend";
import type { Id } from "@baseblocks/backend";
import { useAction, useMutation, useQuery } from "convex/react";
import type {
  DocumentId,
  FolderId,
  LibraryExplorerActions,
  LibraryExplorerData,
  LibraryFile,
  LibraryId,
  SiteId,
} from "../types";

export function useAuthenticatedLibraryData(
  libraryId: LibraryId | null,
): LibraryExplorerData {
  const library = useQuery(
    api.documentLibraries.queries.get,
    libraryId ? { libraryId } : "skip",
  );
  const folders = useQuery(
    api.documentFolders.queries.listByLibrary,
    libraryId ? { libraryId } : "skip",
  );
  const files = useQuery(
    api.documents.queries.listByLibrary,
    libraryId ? { libraryId } : "skip",
  );

  return {
    library,
    folders: folders ?? [],
    files: (files ?? []) as LibraryFile[],
    isLoading:
      library === undefined || folders === undefined || files === undefined,
  };
}

export function usePublicLibraryData(
  libraryId: LibraryId | null,
): LibraryExplorerData {
  const sessionTokens = getStoredAccessSessionTokens();
  const library = useQuery(
    api.documentLibraries.queries.getPublic,
    libraryId ? { libraryId, sessionTokens } : "skip",
  );
  const folders = useQuery(
    api.documentFolders.queries.listByLibraryPublic,
    libraryId ? { libraryId, sessionTokens } : "skip",
  );
  const files = useQuery(
    api.documents.queries.listByLibraryPublic,
    libraryId ? { libraryId, sessionTokens } : "skip",
  );

  return {
    library,
    folders: folders ?? [],
    files: (files ?? []) as LibraryFile[],
    isLoading:
      library === undefined || folders === undefined || files === undefined,
  };
}

export function useLibraryActions(args: {
  libraryId: LibraryId | null;
  siteId: SiteId | null;
}): LibraryExplorerActions & {
  uploadStates: ReturnType<typeof useFileUpload>["uploadStates"];
  isAnyUploading: boolean;
  clearAllUploadStates: () => void;
} {
  const createFolderMutation = useMutation(
    api.documentFolders.mutations.create,
  );
  const updateFolder = useMutation(api.documentFolders.mutations.update);
  const moveFolderMutation = useMutation(api.documentFolders.mutations.move);
  const removeFolder = useMutation(api.documentFolders.mutations.remove);
  const renameDocument = useMutation(api.documents.mutations.rename);
  const moveDocument = useMutation(api.documents.mutations.move);
  const removeDocument = useMutation(api.documents.mutations.remove);
  const retryExtractionAction = useAction(
    api.actions.extractDocument.retryExtraction,
  );
  const { uploadFiles, uploadStates, isAnyUploading, clearAllUploadStates } =
    useFileUpload();

  return {
    uploadStates,
    isAnyUploading,
    clearAllUploadStates,
    createFolder: async (name, parentId) => {
      if (!args.libraryId) throw new Error("No library selected");
      await createFolderMutation({
        libraryId: args.libraryId,
        parentId,
        name,
      });
    },
    deleteFile: async (fileId: DocumentId) => {
      await removeDocument({ documentId: fileId });
    },
    deleteFolder: async (folderId: FolderId) => {
      await removeFolder({ folderId });
    },
    moveFile: async (documentId: DocumentId, folderId?: FolderId) => {
      await moveDocument({ documentId, folderId });
    },
    moveFolder: async (folderId: FolderId, parentId?: FolderId) => {
      await moveFolderMutation({ folderId, newParentId: parentId });
    },
    renameFile: async (documentId: DocumentId, filename: string) => {
      await renameDocument({ documentId, filename });
    },
    renameFolder: async (folderId: FolderId, name: string) => {
      await updateFolder({ folderId, name });
    },
    retryExtraction: async (file: LibraryFile) => {
      await retryExtractionAction({
        documentId: file._id as Id<"documents">,
      });
    },
    uploadFiles: async (files, folderId) => {
      if (!args.libraryId || !args.siteId) {
        throw new Error("No library selected");
      }
      await uploadFiles(files, {
        siteId: args.siteId,
        libraryId: args.libraryId,
        folderId,
      });
    },
  };
}
