import type {
  FolderId,
  LibraryEntity,
  LibraryFile,
  LibraryFolder,
} from "./types";

export type LibraryTreeViewMode = "tree" | "flat";

export const libraryFlatPathSeparator = " > ";

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

export function searchLibraryEntities(
  query: string,
  entities: Iterable<LibraryEntity>,
  limit = 20,
) {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return [];

  return Array.from(entities)
    .map((entity) => {
      const name = entity.name.toLowerCase();
      const path = entity.path.toLowerCase();
      let score = -1;

      if (name === trimmed) score = 1000;
      else if (name.startsWith(trimmed)) score = 500;
      else if (name.includes(trimmed)) score = 250;
      else if (path.includes(trimmed)) score = 100;

      return { entity, score };
    })
    .filter((result) => result.score >= 0)
    .sort(
      (a, b) => b.score - a.score || a.entity.path.localeCompare(b.entity.path),
    )
    .slice(0, limit)
    .map((result) => result.entity);
}

export function buildLibraryTreeView(args: {
  entitiesByTreePath: Map<string, LibraryEntity>;
  mode: LibraryTreeViewMode;
  treePaths: string[];
}) {
  const { entitiesByTreePath, mode, treePaths } = args;

  if (mode === "tree") {
    return {
      entitiesByViewPath: new Map(entitiesByTreePath),
      paths: treePaths,
    };
  }

  const entitiesByViewPath = new Map<string, LibraryEntity>();
  const paths: string[] = [];
  const usedPaths = new Set<string>();

  for (const treePath of treePaths) {
    const entity = entitiesByTreePath.get(treePath);
    if (!entity) continue;

    const basePath = buildLibraryTreeViewPath(entity.path, entity.kind, mode);
    const nextPath = uniquifyViewPath(basePath, entity, usedPaths);

    entitiesByViewPath.set(nextPath, entity);
    paths.push(nextPath);
  }

  return {
    entitiesByViewPath,
    paths,
  };
}

export function buildLibraryTreeViewLookup(
  entitiesByViewPath: Map<string, LibraryEntity>,
) {
  const lookup = new Map<string, LibraryEntity>();

  for (const [viewPath, entity] of entitiesByViewPath) {
    lookup.set(viewPath, entity);

    if (entity.kind === "folder" && viewPath.endsWith("/")) {
      lookup.set(viewPath.slice(0, -1), entity);
    }
  }

  return lookup;
}

export function buildLibraryTreeViewPath(
  actualPath: string,
  kind: LibraryEntity["kind"],
  mode: LibraryTreeViewMode,
) {
  const path =
    mode === "flat"
      ? actualPath.replaceAll("/", libraryFlatPathSeparator)
      : actualPath;

  return kind === "folder" ? `${path}/` : path;
}

export function getLibraryTreeViewLookupPath(path: string, isFolder: boolean) {
  return isFolder && !path.endsWith("/") ? `${path}/` : path;
}

export function getLibraryTreeViewNameFromPath(
  path: string,
  mode: LibraryTreeViewMode,
) {
  const normalizedPath = path.endsWith("/") ? path.slice(0, -1) : path;
  const separator = mode === "flat" ? libraryFlatPathSeparator : "/";
  const separatorIndex = normalizedPath.lastIndexOf(separator);

  return separatorIndex === -1
    ? normalizedPath
    : normalizedPath.slice(separatorIndex + separator.length);
}

export function buildDraftFolderViewPath(args: {
  existingViewPaths: Iterable<string>;
  mode: LibraryTreeViewMode;
  parentActualPath?: string | null;
}) {
  const { existingViewPaths, mode, parentActualPath } = args;
  const usedViewPaths = new Set(existingViewPaths);

  for (let index = 1; index < 10_000; index += 1) {
    const name = index === 1 ? "Untitled folder" : `Untitled folder ${index}`;
    const actualPath = parentActualPath ? `${parentActualPath}/${name}` : name;
    const viewPath = buildLibraryTreeViewPath(actualPath, "folder", mode);

    if (usedViewPaths.has(viewPath)) continue;

    return { actualPath, name, viewPath };
  }

  throw new Error("Could not create a unique draft folder path");
}

function uniquifyViewPath(
  viewPath: string,
  entity: LibraryEntity,
  usedPaths: Set<string>,
) {
  if (!usedPaths.has(viewPath)) {
    usedPaths.add(viewPath);
    return viewPath;
  }

  const suffix =
    entity.kind === "folder"
      ? entity.folder._id.slice(-6)
      : entity.file._id.slice(-6);
  const normalizedPath = viewPath.endsWith("/")
    ? viewPath.slice(0, -1)
    : viewPath;
  const nextPath = `${normalizedPath} (${suffix})${entity.kind === "folder" ? "/" : ""}`;

  usedPaths.add(nextPath);
  return nextPath;
}
