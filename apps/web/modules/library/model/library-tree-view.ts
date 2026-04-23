import type { LibraryEntity } from "../types";

export type LibraryTreeViewMode = "tree" | "flat";

export const libraryFlatPathSeparator = " > ";

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
