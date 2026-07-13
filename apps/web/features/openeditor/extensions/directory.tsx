"use client";

import { baseBlocksSlashMenuOrder } from "@/features/openeditor/slash-menu";
import type {
  DirectoryColumn,
  DirectoryContent,
  DirectoryRow,
} from "@baseblocks/domain";
import { Button } from "@baseblocks/ui/button";
import { Input } from "@baseblocks/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@baseblocks/ui/table";
import {
  defineOpenEditorReactNode,
  NodeViewWrapper,
  type OpenEditorNodeViewProps,
} from "@openeditor/react";
import { Plus, Search, TableProperties, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

const emptyDirectory = (): DirectoryContent => ({
  columns: [],
  rows: [],
  settings: { copyMode: "none", pageSize: 10, showSearch: true },
});

function readDirectory(value: unknown): DirectoryContent {
  if (!value || typeof value !== "object") return emptyDirectory();
  const candidate = value as Partial<DirectoryContent>;
  return {
    columns: Array.isArray(candidate.columns) ? candidate.columns : [],
    rows: Array.isArray(candidate.rows) ? candidate.rows : [],
    settings: {
      copyMode: candidate.settings?.copyMode ?? "none",
      pageSize: Math.max(0, candidate.settings?.pageSize ?? 10),
      showSearch: candidate.settings?.showSearch ?? true,
    },
  };
}

const makeId = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;

function blankRow(columns: DirectoryColumn[]): DirectoryRow {
  return {
    id: makeId("row"),
    cells: Object.fromEntries(columns.map((column) => [column.id, ""])),
  };
}

function DirectoryTable({
  value,
  editable,
  onChange,
}: {
  value: DirectoryContent;
  editable: boolean;
  onChange?: (value: DirectoryContent) => void;
}) {
  const [query, setQuery] = useState("");
  const normalized = readDirectory(value);
  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return normalized.rows;
    return normalized.rows.filter((row) =>
      normalized.columns.some((column) =>
        (row.cells[column.id] ?? "").toLowerCase().includes(needle),
      ),
    );
  }, [normalized.columns, normalized.rows, query]);
  const update = (next: DirectoryContent) => onChange?.(next);

  const addColumn = () => {
    const column: DirectoryColumn = {
      id: makeId("column"),
      header: `Column ${normalized.columns.length + 1}`,
      type: "text",
    };
    update({
      ...normalized,
      columns: [...normalized.columns, column],
      rows: normalized.rows.map((row) => ({
        ...row,
        cells: { ...row.cells, [column.id]: "" },
      })),
    });
  };
  const removeColumn = (columnId: string) =>
    update({
      ...normalized,
      columns: normalized.columns.filter((column) => column.id !== columnId),
      rows: normalized.rows.map((row) => {
        const cells = { ...row.cells };
        delete cells[columnId];
        return { ...row, cells };
      }),
    });
  const updateColumn = (columnId: string, header: string) =>
    update({
      ...normalized,
      columns: normalized.columns.map((column) =>
        column.id === columnId ? { ...column, header } : column,
      ),
    });
  const addRow = () =>
    update({
      ...normalized,
      rows: [...normalized.rows, blankRow(normalized.columns)],
    });
  const removeRow = (rowId: string) =>
    update({
      ...normalized,
      rows: normalized.rows.filter((row) => row.id !== rowId),
    });
  const updateCell = (rowId: string, columnId: string, value: string) =>
    update({
      ...normalized,
      rows: normalized.rows.map((row) =>
        row.id === rowId
          ? { ...row, cells: { ...row.cells, [columnId]: value } }
          : row,
      ),
    });

  return (
    <section className="not-prose my-4 space-y-3">
      {!editable &&
      normalized.settings.showSearch &&
      normalized.columns.length > 0 ? (
        <div className="relative block rounded-2xl transition-all hover:ring-0">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <span className="sr-only">Search directory</span>
          <Input
            className="!rounded-2xl !border-0 !bg-card !pl-10 !shadow-none"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search directory…"
            value={query}
          />
        </div>
      ) : null}
      {normalized.columns.length === 0 ? (
        <div className="flex min-h-28 items-center justify-center rounded-2xl border border-dashed">
          {editable ? (
            <Button
              className="rounded-xl"
              onClick={addColumn}
              size="sm"
              type="button"
              variant="ghost"
            >
              <Plus className="size-4" />
              Add column
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground">
              This directory is empty.
            </p>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl bg-card">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                {normalized.columns.map((column) => (
                  <TableHead
                    className="h-auto min-w-44 px-3 py-1.5"
                    key={column.id}
                  >
                    {editable ? (
                      <div className="flex items-center gap-1">
                        <Input
                          aria-label="Column name"
                          className="h-8 border-transparent bg-transparent px-1 font-medium shadow-none focus-visible:bg-background"
                          onChange={(event) =>
                            updateColumn(column.id, event.target.value)
                          }
                          value={column.header}
                        />
                        <Button
                          aria-label={`Remove ${column.header}`}
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => removeColumn(column.id)}
                          size="icon-xs"
                          type="button"
                          variant="ghost"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    ) : (
                      column.header
                    )}
                  </TableHead>
                ))}
                {editable ? (
                  <TableHead className="h-auto w-10 p-1.5">
                    <Button
                      aria-label="Add column"
                      className="text-muted-foreground"
                      onClick={addColumn}
                      size="icon-xs"
                      type="button"
                      variant="ghost"
                    >
                      <Plus className="size-3.5" />
                    </Button>
                  </TableHead>
                ) : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell
                    className="py-10 text-center text-muted-foreground"
                    colSpan={normalized.columns.length + (editable ? 1 : 0)}
                  >
                    {query ? "No rows found." : "No rows yet."}
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow key={row.id}>
                    {normalized.columns.map((column) => (
                      <TableCell className="min-w-44 p-1.5" key={column.id}>
                        {editable ? (
                          <Input
                            aria-label={`${column.header} value`}
                            className="h-8 border-transparent bg-transparent shadow-none focus-visible:bg-background"
                            onChange={(event) =>
                              updateCell(row.id, column.id, event.target.value)
                            }
                            value={row.cells[column.id] ?? ""}
                          />
                        ) : (
                          (row.cells[column.id] ?? "")
                        )}
                      </TableCell>
                    ))}
                    {editable ? (
                      <TableCell className="w-10 p-1.5">
                        <Button
                          aria-label="Remove row"
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => removeRow(row.id)}
                          size="icon-xs"
                          type="button"
                          variant="ghost"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))
              )}
            </TableBody>
            {editable ? (
              <TableFooter className="border-0 bg-transparent">
                <TableRow className="border-0 hover:bg-transparent">
                  <TableCell
                    className="p-1.5"
                    colSpan={normalized.columns.length + 1}
                  >
                    <Button
                      className="w-full justify-start rounded-xl text-muted-foreground"
                      onClick={addRow}
                      size="sm"
                      type="button"
                      variant="ghost"
                    >
                      <Plus className="size-4" />
                      Add row
                    </Button>
                  </TableCell>
                </TableRow>
              </TableFooter>
            ) : null}
          </Table>
        </div>
      )}
    </section>
  );
}

function DirectoryNode({
  node,
  updateAttributes,
  editor,
}: OpenEditorNodeViewProps) {
  return (
    <NodeViewWrapper contentEditable={false}>
      <DirectoryTable
        editable={editor.isEditable}
        onChange={(directory) => updateAttributes({ directory })}
        value={readDirectory(node.attrs.directory)}
      />
    </NodeViewWrapper>
  );
}

export const directoryExtension = defineOpenEditorReactNode({
  block: {
    name: "baseblocks.directory",
    nodeType: "baseblocksDirectory",
    label: "Directory",
    group: "embed",
    defaultNode: () => ({
      type: "baseblocksDirectory",
      attrs: { directory: emptyDirectory() },
    }),
    support: { web: "supported", native: "unsupported" },
  },
  node: {
    group: "block",
    atom: true,
    draggable: true,
    addAttributes: () => ({ directory: { default: emptyDirectory() } }),
    parseHTML: () => [{ tag: "section[data-baseblocks-directory]" }],
    renderHTML: ({ HTMLAttributes }) => [
      "section",
      { ...HTMLAttributes, "data-baseblocks-directory": "" },
    ],
  },
  component: DirectoryNode,
  slashMenu: {
    icon: TableProperties,
    keywords: ["table", "data", "list", "grid"],
    order: baseBlocksSlashMenuOrder.directory,
  },
  viewer: ({ node }) => (
    <DirectoryTable
      editable={false}
      value={readDirectory(node.attrs?.directory)}
    />
  ),
  exporters: {
    html: {
      baseblocksDirectory: ({ node, escapeHtml }) => {
        const value = readDirectory(node.attrs?.directory);
        return `<table><thead><tr>${value.columns.map((column) => `<th>${escapeHtml(column.header)}</th>`).join("")}</tr></thead><tbody>${value.rows.map((row) => `<tr>${value.columns.map((column) => `<td>${escapeHtml(row.cells[column.id] ?? "")}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
      },
    },
    text: {
      baseblocksDirectory: ({ node }) => {
        const value = readDirectory(node.attrs?.directory);
        return [
          value.columns.map((column) => column.header).join("\t"),
          ...value.rows.map((row) =>
            value.columns
              .map((column) => row.cells[column.id] ?? "")
              .join("\t"),
          ),
        ]
          .filter(Boolean)
          .join("\n");
      },
    },
  },
});
