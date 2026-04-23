import type {
  FolderId,
  LibraryEntity,
  LibraryFile,
  LibraryFolder,
} from "../types";

function sanitizeSegment(value: string) {
  return value.trim().replaceAll("/", ":") || "Untitled";
}

function uniqueSegment(
  segment: string,
  parentKey: string,
  usedSegmentsByParent: Map<string, Set<string>>,
  fallbackId: string,
) {
  const used = usedSegmentsByParent.get(parentKey) ?? new Set<string>();
  usedSegmentsByParent.set(parentKey, used);

  let next = segment;
  if (used.has(next)) {
    next = `${segment} (${fallbackId.slice(-6)})`;
  }
  used.add(next);
  return next;
}

export function buildLibraryEntityMap(
  folders: LibraryFolder[],
  files: LibraryFile[],
) {
  const foldersById = new Map<string, LibraryFolder>();
  const childFoldersByParent = new Map<string, LibraryFolder[]>();
  const filesByParent = new Map<string, LibraryFile[]>();

  for (const folder of folders) {
    foldersById.set(folder._id, folder);
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

  const entities = new Map<string, LibraryEntity>();
  const entitiesByTreePath = new Map<string, LibraryEntity>();
  const folderPathById = new Map<string, string>();
  const treePaths: string[] = [];
  const usedSegmentsByParent = new Map<string, Set<string>>();

  const visitFolder = (folder: LibraryFolder, parentPath: string) => {
    const parentKey = parentPath || "";
    const segment = uniqueSegment(
      sanitizeSegment(folder.name),
      parentKey,
      usedSegmentsByParent,
      folder._id,
    );
    const path = parentPath ? `${parentPath}/${segment}` : segment;
    const treePath = `${path}/`;
    const entity: LibraryEntity = {
      kind: "folder",
      folder,
      path,
      name: folder.name,
    };
    folderPathById.set(folder._id, path);
    entities.set(path, entity);
    entitiesByTreePath.set(treePath, entity);
    treePaths.push(treePath);

    const childFolders = childFoldersByParent.get(folder._id) ?? [];
    for (const child of childFolders) {
      visitFolder(child, path);
    }

    const childFiles = filesByParent.get(folder._id) ?? [];
    for (const file of childFiles) {
      addFile(file, path);
    }
  };

  const addFile = (file: LibraryFile, parentPath: string) => {
    const parentKey = parentPath || "";
    const segment = uniqueSegment(
      sanitizeSegment(file.filename),
      parentKey,
      usedSegmentsByParent,
      file._id,
    );
    const path = parentPath ? `${parentPath}/${segment}` : segment;
    const entity: LibraryEntity = {
      kind: "file",
      file,
      path,
      name: file.filename,
    };
    entities.set(path, entity);
    entitiesByTreePath.set(path, entity);
    treePaths.push(path);
  };

  for (const folder of childFoldersByParent.get("") ?? []) {
    visitFolder(folder, "");
  }

  for (const file of filesByParent.get("") ?? []) {
    addFile(file, "");
  }

  return {
    entities,
    paths: Array.from(entities.keys()),
    entitiesByTreePath,
    treePaths,
    folderPathById,
    childFoldersByParent,
    filesByParent,
    foldersById,
  };
}

export function getFolderPath(
  folderId: FolderId | null,
  foldersById: Map<string, LibraryFolder>,
) {
  if (!folderId) return [];

  const path: LibraryFolder[] = [];
  const visited = new Set<string>();
  let current = foldersById.get(folderId);

  while (current && !visited.has(current._id)) {
    visited.add(current._id);
    path.unshift(current);
    current = current.parentId ? foldersById.get(current.parentId) : undefined;
  }

  return path;
}
