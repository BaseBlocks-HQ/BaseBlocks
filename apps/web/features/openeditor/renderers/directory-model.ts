import type { Directory, DirectoryContent } from "@baseblocks/domain";

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

function migrateDirectory(value: unknown, index: number): Directory {
  const candidate =
    value && typeof value === "object"
      ? (value as Partial<Directory> & {
          columns?: Array<{ id?: unknown }>;
          settings?: { pageSize?: unknown };
        })
      : {};
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
    : Array.isArray(candidate.columns)
      ? candidate.columns
          .map((column) => column?.id)
          .filter(
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
  const persistedPageSize =
    "pageSize" in candidate ? candidate.pageSize : candidate.settings?.pageSize;
  const pageSize =
    typeof persistedPageSize === "number" &&
    Number.isInteger(persistedPageSize) &&
    persistedPageSize > 0
      ? persistedPageSize
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
  const candidate = value as Partial<DirectoryContent> & {
    columns?: unknown[];
    rows?: unknown[];
  };
  const directories =
    Array.isArray(candidate.directories) && candidate.directories.length
      ? candidate.directories
      : Array.isArray(candidate.columns) || Array.isArray(candidate.rows)
        ? [candidate]
        : [];
  return directories.length
    ? { directories: directories.map(migrateDirectory) }
    : createDirectoryContent();
}

export { readDirectoryContent as readDirectory };
