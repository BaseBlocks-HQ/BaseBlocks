import type {
  Directory,
  DirectoryContent,
  DirectoryRow,
} from "@baseblocks/domain";

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
    .flatMap((directory) => [
      ...(content.directories.length > 1 ? [directory.label] : []),
      directoryToTsv(directory),
    ])
    .filter(Boolean)
    .join("\n");
}

export function directoryToHtml(
  content: DirectoryContent,
  escapeHtml: (value: string) => string,
): string {
  return content.directories
    .map((directory) => {
      const rows = directory.rows
        .map(
          (row) =>
            `<tr>${directory.columnIds
              .map(
                (columnId) =>
                  `<td>${escapeHtml(row.cells[columnId] ?? "")}</td>`,
              )
              .join("")}</tr>`,
        )
        .join("");
      const table = `<table><tbody>${rows}</tbody></table>`;
      return content.directories.length > 1
        ? `<section data-baseblocks-directory><h2>${escapeHtml(directory.label)}</h2>${table}</section>`
        : table;
    })
    .join("");
}

function normalizeDirectory(value: unknown, index: number): Directory {
  const candidate =
    value && typeof value === "object" ? (value as Partial<Directory>) : {};
  const id =
    typeof candidate.id === "string"
      ? candidate.id
      : index === 0
        ? "default"
        : `directory-${index + 1}`;
  const columnIds = Array.isArray(candidate.columnIds)
    ? candidate.columnIds.filter(
        (columnId): columnId is string => typeof columnId === "string",
      )
    : [];
  const normalizedColumnIds = columnIds.length ? columnIds : [`${id}-column-1`];
  const rows = Array.isArray(candidate.rows)
    ? candidate.rows.filter(
        (row) =>
          row &&
          typeof row.id === "string" &&
          row.cells &&
          typeof row.cells === "object",
      )
    : [];
  const pageSize =
    typeof candidate.pageSize === "number" &&
    Number.isInteger(candidate.pageSize) &&
    candidate.pageSize > 0
      ? candidate.pageSize
      : null;

  return {
    id,
    label:
      typeof candidate.label === "string"
        ? candidate.label
        : `Directory ${index + 1}`,
    columnIds: normalizedColumnIds,
    pageSize,
    rows: rows.length
      ? rows
      : [
          {
            id: `${id}-row-1`,
            cells: Object.fromEntries(
              normalizedColumnIds.map((columnId) => [columnId, ""]),
            ),
          },
        ],
  };
}

export function readDirectoryContent(value: unknown): DirectoryContent {
  if (!value || typeof value !== "object") return createDirectoryContent();
  const candidate = value as Partial<DirectoryContent>;
  const directories =
    Array.isArray(candidate.directories) && candidate.directories.length
      ? candidate.directories
      : [];
  return directories.length
    ? { directories: directories.map(normalizeDirectory) }
    : createDirectoryContent();
}

export { readDirectoryContent as readDirectory };
