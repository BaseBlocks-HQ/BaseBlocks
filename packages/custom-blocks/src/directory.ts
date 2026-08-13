export interface DirectoryRow {
  id: string;
  cells: Record<string, string>;
}

export interface Directory {
  id: string;
  label: string;
  columnIds: string[];
  rows: DirectoryRow[];
  pageSize: number | null;
}

export interface DirectoryContent {
  directories: Directory[];
}

export type DirectoryIdFactory = (kind: "column" | "row") => string;

export function createDirectoryRow(
  columnIds: readonly string[],
  rowId: string,
): DirectoryRow {
  return {
    id: rowId,
    cells: Object.fromEntries(columnIds.map((id) => [id, ""])),
  };
}

function insertAt<T>(items: T[], target: T, item: T, after: boolean) {
  const index = items.indexOf(target);
  if (index < 0) return items;
  const next = [...items];
  next.splice(index + Number(after), 0, item);
  return next;
}

export function insertDirectoryRow(
  directory: Directory,
  targetId: string,
  after: boolean,
  createId: DirectoryIdFactory,
): Directory {
  const target = directory.rows.find((row) => row.id === targetId);
  if (!target) return directory;
  return {
    ...directory,
    rows: insertAt(
      directory.rows,
      target,
      createDirectoryRow(directory.columnIds, createId("row")),
      after,
    ),
  };
}

export function insertDirectoryColumn(
  directory: Directory,
  targetId: string,
  after: boolean,
  createId: DirectoryIdFactory,
): Directory {
  const columnId = createId("column");
  const columnIds = insertAt(directory.columnIds, targetId, columnId, after);
  if (columnIds === directory.columnIds) return directory;
  return {
    ...directory,
    columnIds,
    rows: directory.rows.map((row) => ({
      ...row,
      cells: { ...row.cells, [columnId]: "" },
    })),
  };
}

export function removeDirectoryColumn(
  directory: Directory,
  columnId: string,
): Directory {
  return {
    ...directory,
    columnIds: directory.columnIds.filter((id) => id !== columnId),
    rows: directory.rows.map(({ cells, ...row }) => {
      const { [columnId]: _, ...nextCells } = cells;
      return { ...row, cells: nextCells };
    }),
  };
}

export function deleteDirectoryRow(
  directory: Directory,
  rowId: string,
): Directory {
  if (directory.rows.length <= 1) return directory;
  const rows = directory.rows.filter(({ id }) => id !== rowId);
  return rows.length === directory.rows.length
    ? directory
    : { ...directory, rows };
}

export function duplicateDirectoryRow(
  directory: Directory,
  rowId: string,
  createId: DirectoryIdFactory,
): Directory {
  const row = directory.rows.find(({ id }) => id === rowId);
  if (!row) return directory;
  return {
    ...directory,
    rows: insertAt(
      directory.rows,
      row,
      { ...row, id: createId("row"), cells: { ...row.cells } },
      true,
    ),
  };
}

export function duplicateDirectoryColumn(
  directory: Directory,
  columnId: string,
  createId: DirectoryIdFactory,
): Directory {
  if (!directory.columnIds.includes(columnId)) return directory;
  const nextId = createId("column");
  return {
    ...directory,
    columnIds: insertAt(directory.columnIds, columnId, nextId, true),
    rows: directory.rows.map((row) => ({
      ...row,
      cells: { ...row.cells, [nextId]: row.cells[columnId] ?? "" },
    })),
  };
}

export function pasteDirectoryRow(
  directory: Directory,
  rowId: string,
  values: readonly string[],
  createId: DirectoryIdFactory,
): Directory {
  const missing = Math.max(0, values.length - directory.columnIds.length);
  const columnIds = [
    ...directory.columnIds,
    ...Array.from({ length: missing }, () => createId("column")),
  ];
  return {
    ...directory,
    columnIds,
    rows: directory.rows.map((row) => ({
      ...row,
      cells: Object.fromEntries(
        columnIds.map((id, index) => [
          id,
          row.id === rowId ? (values[index] ?? "") : (row.cells[id] ?? ""),
        ]),
      ),
    })),
  };
}

export function pasteDirectoryColumn(
  directory: Directory,
  columnId: string,
  values: readonly string[],
  createId: DirectoryIdFactory,
): Directory {
  const missing = Math.max(0, values.length - directory.rows.length);
  const rows = [
    ...directory.rows,
    ...Array.from({ length: missing }, () =>
      createDirectoryRow(directory.columnIds, createId("row")),
    ),
  ];
  return {
    ...directory,
    rows: rows.map((row, index) => ({
      ...row,
      cells: { ...row.cells, [columnId]: values[index] ?? "" },
    })),
  };
}

export function createDirectory(
  id: string,
  label: string,
  columnId: string,
  rowId: string,
): Directory {
  return {
    id,
    label,
    columnIds: [columnId],
    rows: [{ id: rowId, cells: { [columnId]: "" } }],
    pageSize: null,
  };
}

export function createDirectoryContent(): DirectoryContent {
  return {
    directories: [
      createDirectory(
        "default",
        "Directory 1",
        "default-column-1",
        "default-row-1",
      ),
    ],
  };
}

export type DirectoryEntityIdFactory = (
  kind: "directory" | "column" | "row",
) => string;

export function addDirectory(
  content: DirectoryContent,
  createId: DirectoryEntityIdFactory,
): { content: DirectoryContent; activeId: string } {
  const directory = createDirectory(
    createId("directory"),
    `Directory ${content.directories.length + 1}`,
    createId("column"),
    createId("row"),
  );
  return {
    content: { directories: [...content.directories, directory] },
    activeId: directory.id,
  };
}

export function duplicateDirectory(
  content: DirectoryContent,
  directoryId: string,
  createId: DirectoryEntityIdFactory,
): { content: DirectoryContent; activeId: string } {
  const source = content.directories.find(({ id }) => id === directoryId);
  if (!source) return { content, activeId: directoryId };
  const columnIds = source.columnIds.map(() => createId("column"));
  const directory: Directory = {
    ...source,
    id: createId("directory"),
    label: `${source.label} copy`,
    columnIds,
    rows: source.rows.map((row) => ({
      id: createId("row"),
      cells: Object.fromEntries(
        columnIds.map((id, index) => [
          id,
          row.cells[source.columnIds[index] ?? ""] ?? "",
        ]),
      ),
    })),
  };
  return {
    content: { directories: [...content.directories, directory] },
    activeId: directory.id,
  };
}

export function deleteDirectory(
  content: DirectoryContent,
  directoryId: string,
): { content: DirectoryContent; activeId: string } {
  if (content.directories.length <= 1)
    return { content, activeId: content.directories[0]?.id ?? directoryId };
  const index = content.directories.findIndex(({ id }) => id === directoryId);
  if (index < 0) return { content, activeId: content.directories[0]?.id ?? "" };
  const directories = content.directories.filter(
    ({ id }) => id !== directoryId,
  );
  return {
    content: { directories },
    activeId: directories[Math.min(index, directories.length - 1)]?.id ?? "",
  };
}

export function renameDirectory(
  content: DirectoryContent,
  directoryId: string,
  label: string,
): DirectoryContent {
  return {
    directories: content.directories.map((directory) =>
      directory.id === directoryId ? { ...directory, label } : directory,
    ),
  };
}

export function moveDirectoryItem<T extends string | { id: string }>(
  items: T[],
  sourceId: string,
  targetId: string,
): T[] {
  const id = (item: T) => (typeof item === "string" ? item : item.id);
  const from = items.findIndex((item) => id(item) === sourceId);
  const to = items.findIndex((item) => id(item) === targetId);
  if (from < 0 || to < 0 || from === to) return items;

  const next = [...items];
  const [item] = next.splice(from, 1);
  if (item) next.splice(to, 0, item);
  return next;
}

export function directoryToTsv(directory: Directory): string {
  return directory.rows
    .map((row) =>
      directory.columnIds
        .map((columnId) => row.cells[columnId] ?? "")
        .join("\t"),
    )
    .join("\n");
}

export function directoryToText(content: DirectoryContent): string {
  return content.directories
    .flatMap((directory) => [directory.label, directoryToTsv(directory)])
    .filter(Boolean)
    .join("\n");
}
