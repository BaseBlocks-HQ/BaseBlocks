import type { api } from "@baseblocks/backend";
import type { FunctionReturnType } from "convex/server";

export type LibraryExplorerPayload = NonNullable<
  FunctionReturnType<typeof api.libraries.getExplorer>
>;
export type LibraryFolder = LibraryExplorerPayload["folders"][number];
export type LibraryFile = LibraryExplorerPayload["files"][number];
export type FolderId = LibraryFolder["_id"];
export type DocumentId = LibraryFile["_id"];
export type LibraryId = LibraryExplorerPayload["library"]["_id"];

export type LibraryEntity =
  | { kind: "folder"; folder: LibraryFolder; path: string; name: string }
  | { kind: "file"; file: LibraryFile; path: string; name: string };

export type LibraryDialogTarget =
  | { kind: "folder"; id: FolderId; name: string }
  | { kind: "file"; id: DocumentId; name: string };

export function buildLibraryTreeInput(
  folders: LibraryFolder[],
  files: LibraryFile[],
) {
  const childFoldersByParent = new Map<string, LibraryFolder[]>();
  const filesByParent = new Map<string, LibraryFile[]>();
  const folderPathById = new Map<string, string>();
  const entityByPath = new Map<string, LibraryEntity>();
  const entityByFileId = new Map<string, LibraryEntity>();
  const paths: string[] = [];

  for (const folder of folders) {
    const parentKey = folder.parentId ?? "";
    const children = childFoldersByParent.get(parentKey) ?? [];
    children.push(folder);
    childFoldersByParent.set(parentKey, children);
  }

  for (const file of files) {
    const parentKey = file.folderId ?? "";
    const children = filesByParent.get(parentKey) ?? [];
    children.push(file);
    filesByParent.set(parentKey, children);
  }

  for (const children of childFoldersByParent.values()) {
    children.sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
  }

  for (const children of filesByParent.values()) {
    children.sort((a, b) => a.filename.localeCompare(b.filename));
  }

  const usedSegmentsByParent = new Map<string, Set<string>>();

  const uniquePathSegment = (
    value: string,
    parentPath: string,
    fallbackId: string,
  ) => {
    const segment = sanitizePathSegment(value);
    const used = usedSegmentsByParent.get(parentPath) ?? new Set<string>();
    usedSegmentsByParent.set(parentPath, used);

    if (!used.has(segment)) {
      used.add(segment);
      return segment;
    }

    const uniqueSegment = `${segment} (${fallbackId.slice(-6)})`;
    used.add(uniqueSegment);
    return uniqueSegment;
  };

  const addFile = (file: LibraryFile, parentPath: string) => {
    const segment = uniquePathSegment(file.filename, parentPath, file._id);
    const path = parentPath ? `${parentPath}/${segment}` : segment;
    const entity: LibraryEntity = {
      kind: "file",
      file,
      path,
      name: file.filename,
    };
    entityByPath.set(path, entity);
    entityByFileId.set(file._id, entity);
    paths.push(path);
  };

  const addFolder = (folder: LibraryFolder, parentPath: string) => {
    const segment = uniquePathSegment(folder.name, parentPath, folder._id);
    const path = parentPath ? `${parentPath}/${segment}` : segment;
    const treePath = `${path}/`;
    const entity: LibraryEntity = {
      kind: "folder",
      folder,
      path,
      name: folder.name,
    };
    folderPathById.set(folder._id, path);
    entityByPath.set(treePath, entity);
    paths.push(treePath);

    for (const child of childFoldersByParent.get(folder._id) ?? []) {
      addFolder(child, path);
    }

    for (const file of filesByParent.get(folder._id) ?? []) {
      addFile(file, path);
    }
  };

  for (const folder of childFoldersByParent.get("") ?? []) {
    addFolder(folder, "");
  }

  for (const file of filesByParent.get("") ?? []) {
    addFile(file, "");
  }

  return {
    entityByFileId,
    entityByPath,
    folderPathById,
    paths,
  };
}

export function basenameFromTreePath(path: string) {
  const normalized = path.endsWith("/") ? path.slice(0, -1) : path;
  const index = normalized.lastIndexOf("/");
  return index === -1 ? normalized : normalized.slice(index + 1);
}

export function parentPathFromTreePath(path: string) {
  const normalized = path.endsWith("/") ? path.slice(0, -1) : path;
  const index = normalized.lastIndexOf("/");
  return index === -1 ? null : normalized.slice(0, index);
}

export function folderTreePath(path: string) {
  return path.endsWith("/") ? path : `${path}/`;
}

function sanitizePathSegment(value: string) {
  return value.trim().replaceAll("/", ":") || "Untitled";
}
