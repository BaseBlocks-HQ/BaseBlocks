import type {
  Directory,
  DirectoryColumn,
  DirectoryContent,
  DirectoryRow,
} from "@baseblocks/domain";

export type { Directory, DirectoryColumn, DirectoryContent, DirectoryRow };

const object = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Directory data must be an object.");
  return value as Record<string, unknown>;
};

export function parseDirectoryContent(value: unknown): DirectoryContent {
  const root = object(value);
  if (!Array.isArray(root.directories) || root.directories.length < 1)
    throw new Error("Directory data must contain at least one directory.");
  const directoryIds = new Set<string>();
  const directories = root.directories.map((item) => {
    const input = object(item);
    if (typeof input.id !== "string" || !input.id)
      throw new Error("Each directory needs an ID.");
    if (directoryIds.has(input.id))
      throw new Error("Directory IDs must be unique.");
    directoryIds.add(input.id);
    if (typeof input.label !== "string")
      throw new Error("Each directory needs a label.");
    if (!Array.isArray(input.columns) || input.columns.length < 1)
      throw new Error("Each directory needs at least one column.");
    const columns = input.columns.map((value, columnIndex) => {
      const column = object(value);
      if (typeof column.id !== "string" || !column.id)
        throw new Error("Each directory column needs an ID.");
      if (typeof column.name !== "string")
        throw new Error(`Directory column ${columnIndex + 1} needs a name.`);
      if (column.name.length > 200)
        throw new Error(
          "Directory column names must be 200 characters or less.",
        );
      return { id: column.id, name: column.name.trim() };
    });
    if (new Set(columns.map(({ id }) => id)).size !== columns.length)
      throw new Error("Directory column IDs must be unique.");
    const columnIdSet = new Set(columns.map(({ id }) => id));
    if (!Array.isArray(input.rows) || input.rows.length < 1)
      throw new Error("Each directory needs at least one row.");
    const rowIds = new Set<string>();
    const rows = input.rows.map((rowValue) => {
      const row = object(rowValue);
      if (typeof row.id !== "string" || !row.id)
        throw new Error("Each directory row needs an ID.");
      if (rowIds.has(row.id))
        throw new Error("Directory row IDs must be unique.");
      rowIds.add(row.id);
      const rawCells = object(row.cells);
      if (
        Object.keys(rawCells).length !== columns.length ||
        Object.keys(rawCells).some((id) => !columnIdSet.has(id))
      )
        throw new Error("Directory cells must match the directory columns.");
      const cells = Object.fromEntries(
        columns.map(({ id }) => {
          const cell = rawCells[id];
          if (typeof cell !== "string")
            throw new Error("Directory cell values must be strings.");
          return [id, cell];
        }),
      );
      return { id: row.id, cells };
    });
    const pageSize = input.pageSize;
    if (
      pageSize !== null &&
      (!Number.isSafeInteger(pageSize) || Number(pageSize) < 1)
    )
      throw new Error(
        "Directory page size must be null or a positive integer.",
      );
    return {
      id: input.id,
      label: input.label,
      columns,
      rows,
      pageSize: pageSize === null ? null : Number(pageSize),
    };
  });
  if (
    root.width !== undefined &&
    root.width !== "default" &&
    root.width !== "full"
  )
    throw new Error('Directory width must be "default" or "full".');
  return {
    directories,
    ...(root.width === undefined ? {} : { width: root.width }),
  };
}

/**
 * Convert the persisted directory shape from version 1 to version 2.
 * Version 1 stored only column IDs, so the migration preserves the existing
 * display that the viewer generated for those columns.
 */
export function migrateDirectoryContentV1(value: unknown): DirectoryContent {
  const root = object(value);
  if (!Array.isArray(root.directories))
    throw new Error("Directory data must contain directories.");
  const directories = root.directories.map((value) => {
    const input = object(value);
    if (Array.isArray(input.columns)) return input;
    if (!Array.isArray(input.columnIds))
      throw new Error("Directory version 1 data must contain column IDs.");
    const columns = input.columnIds.map((id, index) => {
      if (typeof id !== "string" || !id)
        throw new Error("Each directory column needs an ID.");
      return { id, name: `Column ${index + 1}` };
    });
    const { columnIds: _columnIds, ...rest } = input;
    return { ...rest, columns };
  });
  return parseDirectoryContent({ directories });
}

export type DirectoryIdFactory = (kind: "column" | "row") => string;

export function createDirectoryRow(
  columns: readonly DirectoryColumn[],
  rowId: string,
): DirectoryRow {
  return {
    id: rowId,
    cells: Object.fromEntries(columns.map(({ id }) => [id, ""])),
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
      createDirectoryRow(directory.columns, createId("row")),
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
  const column = { id: createId("column"), name: "New column" };
  const target = directory.columns.find(({ id }) => id === targetId);
  if (!target) return directory;
  const columns = insertAt(directory.columns, target, column, after);
  return {
    ...directory,
    columns,
    rows: directory.rows.map((row) => ({
      ...row,
      cells: { ...row.cells, [column.id]: "" },
    })),
  };
}

export function removeDirectoryColumn(
  directory: Directory,
  columnId: string,
): Directory {
  return {
    ...directory,
    columns: directory.columns.filter(({ id }) => id !== columnId),
    rows: directory.rows.map(({ cells, ...row }) => {
      const { [columnId]: _, ...nextCells } = cells;
      return { ...row, cells: nextCells };
    }),
  };
}

export function deleteDirectoryColumns(
  directory: Directory,
  columnIds: readonly string[],
): Directory {
  const selected = new Set(columnIds);
  const remaining = directory.columns.filter(({ id }) => !selected.has(id));
  if (remaining.length === directory.columns.length) return directory;
  const columns = remaining.length > 0 ? remaining : [directory.columns[0]!];
  return {
    ...directory,
    columns,
    rows: directory.rows.map(({ cells, ...row }) => ({
      ...row,
      cells: Object.fromEntries(columns.map(({ id }) => [id, cells[id] ?? ""])),
    })),
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
  const source = directory.columns.find(({ id }) => id === columnId);
  if (!source) return directory;
  const nextId = createId("column");
  return {
    ...directory,
    columns: insertAt(
      directory.columns,
      source,
      { ...source, id: nextId, name: `${source.name} copy` },
      true,
    ),
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
  const missing = Math.max(0, values.length - directory.columns.length);
  const columns = [
    ...directory.columns,
    ...Array.from({ length: missing }, () => ({
      id: createId("column"),
      name: "New column",
    })),
  ];
  return {
    ...directory,
    columns,
    rows: directory.rows.map((row) => ({
      ...row,
      cells: Object.fromEntries(
        columns.map(({ id }, index) => [
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
      createDirectoryRow(directory.columns, createId("row")),
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
    columns: [{ id: columnId, name: "Name" }],
    rows: [{ id: rowId, cells: { [columnId]: "" } }],
    pageSize: null,
  };
}

export function renameDirectoryColumn(
  directory: Directory,
  columnId: string,
  name: string,
): Directory {
  return {
    ...directory,
    columns: directory.columns.map((column) =>
      column.id === columnId ? { ...column, name: name.trim() } : column,
    ),
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
  const columns = source.columns.map((column) => ({
    ...column,
    id: createId("column"),
  }));
  const directory: Directory = {
    ...source,
    id: createId("directory"),
    label: `${source.label} copy`,
    columns,
    rows: source.rows.map((row) => ({
      id: createId("row"),
      cells: Object.fromEntries(
        columns.map(({ id }, index) => [
          id,
          row.cells[source.columns[index]?.id ?? ""] ?? "",
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

export function reorderDirectories(
  content: DirectoryContent,
  sourceId: string,
  targetId: string,
): DirectoryContent {
  return {
    directories: moveDirectoryItem(content.directories, sourceId, targetId),
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

export function filterDirectoryRows(
  directory: Directory,
  query: string,
): DirectoryRow[] {
  const normalized = query.trim().toLocaleLowerCase();
  if (!normalized) return directory.rows;
  return directory.rows.filter((row) =>
    directory.columns.some(({ id }) =>
      (row.cells[id] ?? "").toLocaleLowerCase().includes(normalized),
    ),
  );
}

export function directoryToTsv(directory: Directory): string {
  return directory.rows
    .map((row) =>
      directory.columns.map(({ id }) => row.cells[id] ?? "").join("\t"),
    )
    .join("\n");
}

export function directoryToText(content: DirectoryContent): string {
  return content.directories
    .flatMap((directory) => [directory.label, directoryToTsv(directory)])
    .filter(Boolean)
    .join("\n");
}
