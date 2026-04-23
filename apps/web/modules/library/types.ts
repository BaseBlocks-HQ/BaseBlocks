import type { Doc, Id } from "@baseblocks/backend";

export type LibraryId = Id<"documentLibraries">;
export type SiteId = Id<"sites">;
export type FolderId = Id<"documentFolders">;
export type DocumentId = Id<"documents">;

export type LibraryRecord = Doc<"documentLibraries">;
export type LibraryFolder = Doc<"documentFolders">;

export interface LibraryFile {
  _id: DocumentId;
  filename: string;
  contentType: string;
  size: number;
  downloadUrl: string;
  createdAt: number;
  folderId?: FolderId;
  extractionStatus?: string;
  extractionError?: string;
}

export type LibraryEntity =
  | { kind: "folder"; folder: LibraryFolder; path: string; name: string }
  | { kind: "file"; file: LibraryFile; path: string; name: string };

export type LibraryDialogTarget =
  | { kind: "folder"; id: FolderId; name: string }
  | { kind: "file"; id: DocumentId; name: string };

export type LibraryAccess = "manage" | "read";

export interface LibraryExplorerOptions {
  access: LibraryAccess;
  allowDownloads: boolean;
  embedded?: boolean;
  showLibraryPicker?: boolean;
}

export interface LibraryExplorerData {
  library: LibraryRecord | null | undefined;
  folders: LibraryFolder[];
  files: LibraryFile[];
  isLoading: boolean;
}

export interface LibraryExplorerActions {
  createFolder?: (name: string, parentId?: FolderId) => Promise<void>;
  deleteFile?: (fileId: DocumentId) => Promise<void>;
  deleteFolder?: (folderId: FolderId) => Promise<void>;
  moveFile?: (fileId: DocumentId, folderId?: FolderId) => Promise<void>;
  moveFolder?: (folderId: FolderId, parentId?: FolderId) => Promise<void>;
  renameFile?: (fileId: DocumentId, filename: string) => Promise<void>;
  renameFolder?: (folderId: FolderId, name: string) => Promise<void>;
  retryExtraction?: (file: LibraryFile) => Promise<void>;
  uploadFiles?: (files: File[], folderId?: FolderId) => Promise<void>;
}
