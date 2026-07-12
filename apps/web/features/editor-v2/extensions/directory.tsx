"use client";

import type {
  DirectoryColumn,
  DirectoryContent,
  DirectoryRow,
} from "@baseblocks/domain";
import { Button } from "@baseblocks/ui/button";
import { Input } from "@baseblocks/ui/input";
import {
  defineOpenEditorReactNode,
  NodeViewWrapper,
  type OpenEditorNodeViewProps,
} from "@openeditor/react";
import { Plus, Search, Trash2 } from "lucide-react";
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
  const removeColumn = (id: string) =>
    update({
      ...normalized,
      columns: normalized.columns.filter((column) => column.id !== id),
      rows: normalized.rows.map((row) => ({
        ...row,
        cells: Object.fromEntries(
          Object.entries(row.cells).filter(([key]) => key !== id),
        ),
      })),
    });
  const addRow = () => {
    const row: DirectoryRow = {
      id: makeId("row"),
      cells: Object.fromEntries(
        normalized.columns.map((column) => [column.id, ""]),
      ),
    };
    update({ ...normalized, rows: [...normalized.rows, row] });
  };

  return (
    <section className="not-prose my-4 space-y-3 rounded-xl border bg-background p-4">
      {editable ? (
        <div className="flex gap-2">
          <Button onClick={addColumn} size="sm" type="button" variant="outline">
            <Plus className="size-4" />
            Column
          </Button>
          <Button
            disabled={normalized.columns.length === 0}
            onClick={addRow}
            size="sm"
            type="button"
            variant="outline"
          >
            <Plus className="size-4" />
            Row
          </Button>
        </div>
      ) : null}
      {!editable &&
      normalized.settings.showSearch &&
      normalized.columns.length > 0 ? (
        <div className="relative block">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <span className="sr-only">Search directory</span>
          <Input
            className="pl-9"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search directory…"
            value={query}
          />
        </div>
      ) : null}
      {normalized.columns.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          {editable
            ? "Add a column to start this directory."
            : "This directory is empty."}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                {normalized.columns.map((column) => (
                  <th className="min-w-44 p-2 text-left" key={column.id}>
                    {editable ? (
                      <div className="flex gap-1">
                        <Input
                          aria-label="Column name"
                          className="h-8"
                          onChange={(event) =>
                            update({
                              ...normalized,
                              columns: normalized.columns.map((item) =>
                                item.id === column.id
                                  ? { ...item, header: event.target.value }
                                  : item,
                              ),
                            })
                          }
                          value={column.header}
                        />
                        <Button
                          aria-label={`Remove ${column.header}`}
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
                  </th>
                ))}
                {editable ? <th className="w-10" /> : null}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr className="border-b last:border-0" key={row.id}>
                  {normalized.columns.map((column) => (
                    <td className="p-2" key={column.id}>
                      {editable ? (
                        <Input
                          aria-label={`${column.header} value`}
                          className="h-8"
                          onChange={(event) =>
                            update({
                              ...normalized,
                              rows: normalized.rows.map((item) =>
                                item.id === row.id
                                  ? {
                                      ...item,
                                      cells: {
                                        ...item.cells,
                                        [column.id]: event.target.value,
                                      },
                                    }
                                  : item,
                              ),
                            })
                          }
                          value={row.cells[column.id] ?? ""}
                        />
                      ) : (
                        (row.cells[column.id] ?? "")
                      )}
                    </td>
                  ))}
                  {editable ? (
                    <td className="p-2">
                      <Button
                        aria-label="Remove row"
                        onClick={() =>
                          update({
                            ...normalized,
                            rows: normalized.rows.filter(
                              (item) => item.id !== row.id,
                            ),
                          })
                        }
                        size="icon-xs"
                        type="button"
                        variant="ghost"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
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
  slashMenu: { keywords: ["table", "data", "list", "grid"] },
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
