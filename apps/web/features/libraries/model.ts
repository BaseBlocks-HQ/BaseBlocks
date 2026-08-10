import type { api } from "@baseblocks/backend";
import type { FunctionReturnType } from "convex/server";
import type { TreeNode } from "@baseblocks/domain";

export type LibraryExplorerPayload = NonNullable<
  FunctionReturnType<typeof api.libraries.getExplorer>
>;
type LibraryFolder = LibraryExplorerPayload["folders"][number];
export type LibraryFile = LibraryExplorerPayload["files"][number];
export type FolderId = LibraryFolder["_id"];
export type FileId = LibraryFile["_id"];
export type LibraryId = LibraryExplorerPayload["library"]["_id"];
export type LibraryEntity =
  | { kind: "folder"; folder: LibraryFolder }
  | { kind: "file"; file: LibraryFile };
export type LibraryDialogTarget =
  | { kind: "folder"; id: FolderId; name: string }
  | { kind: "file"; id: FileId; name: string };

export interface LibraryExplorerModel {
  nodes: TreeNode<LibraryEntity>[];
  entityById: ReadonlyMap<string, LibraryEntity>;
  entityByFileId: ReadonlyMap<FileId, LibraryEntity>;
}

export function buildLibraryExplorerModel(
  folders: LibraryFolder[],
  files: LibraryFile[],
): LibraryExplorerModel {
  const nodes: TreeNode<LibraryEntity>[] = [];
  const entityById = new Map<string, LibraryEntity>();
  const entityByFileId = new Map<FileId, LibraryEntity>();

  for (const folder of folders) {
    const entity: LibraryEntity = { kind: "folder", folder };
    nodes.push({
      id: folder._id,
      parentId: folder.parentId ?? null,
      label: folder.name,
      order: folder.order,
      data: entity,
    });
    entityById.set(folder._id, entity);
  }

  for (const file of files) {
    const entity: LibraryEntity = { kind: "file", file };
    nodes.push({
      id: file._id,
      parentId: file.folderId ?? null,
      label: file.filename,
      order: file.order,
      data: entity,
    });
    entityById.set(file._id, entity);
    entityByFileId.set(file._id, entity);
  }

  return { nodes, entityById, entityByFileId };
}

export const LIBRARY_FILE_SEARCH_PARAM = "file";

export function buildLibraryFilePath(
  pathname: string,
  currentSearchParams: string,
  fileId: string | null,
): string {
  const params = new URLSearchParams(currentSearchParams);
  if (fileId) {
    params.set(LIBRARY_FILE_SEARCH_PARAM, fileId);
  } else {
    params.delete(LIBRARY_FILE_SEARCH_PARAM);
  }

  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}
