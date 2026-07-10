"use client";

import type {
  ElementEditorProps,
  ElementRendererProps,
} from "@/components/site-elements/registry";
import type {
  DirectoryColumn,
  DirectoryContent,
  DirectoryRow,
} from "@baseblocks/domain/elements";
import { Button } from "@baseblocks/ui/button";
import { Input } from "@baseblocks/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@baseblocks/ui/table";
import { Plus, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

function blankRow(columns: DirectoryColumn[]): DirectoryRow {
  return {
    id: makeId("row"),
    cells: Object.fromEntries(columns.map((column) => [column.id, ""])),
  };
}

function normalizeDirectory(content: DirectoryContent): DirectoryContent {
  return {
    columns: content.columns,
    rows: content.rows,
    settings: {
      copyMode: "none",
      pageSize: 0,
      showSearch: true,
    },
  };
}

export function DirectoryEditor({
  content,
  onUpdate,
  onSaveStatusChange,
}: ElementEditorProps<"directory">) {
  const [draft, setDraft] = useState(() => normalizeDirectory(content));

  const save = (next: DirectoryContent) => {
    setDraft(next);
    onSaveStatusChange?.("saving");
    onUpdate(next);
    onSaveStatusChange?.("saved");
  };

  const addColumn = () => {
    const column: DirectoryColumn = {
      id: makeId("col"),
      header: `Column ${draft.columns.length + 1}`,
      type: "text",
    };
    save({
      ...draft,
      columns: [...draft.columns, column],
      rows: draft.rows.map((row) => ({
        ...row,
        cells: { ...row.cells, [column.id]: "" },
      })),
    });
  };

  const removeColumn = (columnId: string) => {
    save({
      ...draft,
      columns: draft.columns.filter((column) => column.id !== columnId),
      rows: draft.rows.map((row) => {
        const cells = { ...row.cells };
        delete cells[columnId];
        return { ...row, cells };
      }),
    });
  };

  const updateColumn = (columnId: string, header: string) => {
    save({
      ...draft,
      columns: draft.columns.map((column) =>
        column.id === columnId ? { ...column, header } : column,
      ),
    });
  };

  const addRow = () => {
    save({ ...draft, rows: [...draft.rows, blankRow(draft.columns)] });
  };

  const removeRow = (rowId: string) => {
    save({ ...draft, rows: draft.rows.filter((row) => row.id !== rowId) });
  };

  const updateCell = (rowId: string, columnId: string, value: string) => {
    save({
      ...draft,
      rows: draft.rows.map((row) =>
        row.id === rowId
          ? { ...row, cells: { ...row.cells, [columnId]: value } }
          : row,
      ),
    });
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Button type="button" size="sm" variant="outline" onClick={addColumn}>
          <Plus className="size-4" />
          Column
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={addRow}
          disabled={draft.columns.length === 0}
        >
          <Plus className="size-4" />
          Row
        </Button>
      </div>

      {draft.columns.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border/70 px-4 py-12 text-center text-sm text-muted-foreground">
          Add a column to start this directory.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border/70">
          <Table>
            <TableHeader>
              <TableRow>
                {draft.columns.map((column) => (
                  <TableHead key={column.id} className="min-w-48">
                    <div className="flex items-center gap-1">
                      <Input
                        value={column.header}
                        className="h-8 border-transparent bg-transparent px-1 font-medium shadow-none"
                        onChange={(event) =>
                          updateColumn(column.id, event.target.value)
                        }
                      />
                      <Button
                        type="button"
                        size="icon-xs"
                        variant="ghost"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => removeColumn(column.id)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </TableHead>
                ))}
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {draft.rows.map((row) => (
                <TableRow key={row.id}>
                  {draft.columns.map((column) => (
                    <TableCell key={column.id} className="min-w-48 p-1">
                      <Input
                        value={row.cells[column.id] ?? ""}
                        className="h-8 border-transparent bg-transparent shadow-none"
                        onChange={(event) =>
                          updateCell(row.id, column.id, event.target.value)
                        }
                      />
                    </TableCell>
                  ))}
                  <TableCell className="w-10 p-1">
                    <Button
                      type="button"
                      size="icon-xs"
                      variant="ghost"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => removeRow(row.id)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

export function DirectoryRenderer({
  content,
}: ElementRendererProps<"directory">) {
  const directory = normalizeDirectory(content);
  const [query, setQuery] = useState("");
  const rows = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return directory.rows;
    return directory.rows.filter((row) =>
      directory.columns.some((column) =>
        (row.cells[column.id] ?? "").toLowerCase().includes(normalized),
      ),
    );
  }, [directory, query]);

  if (directory.columns.length === 0) return null;

  return (
    <div className="not-prose space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          placeholder="Search directory..."
          className="pl-9"
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>
      <div className="overflow-x-auto rounded-lg border border-border/70">
        <Table>
          <TableHeader>
            <TableRow>
              {directory.columns.map((column) => (
                <TableHead key={column.id}>{column.header}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={directory.columns.length}
                  className="py-8 text-center text-muted-foreground"
                >
                  No rows found.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id}>
                  {directory.columns.map((column) => (
                    <TableCell key={column.id} className="whitespace-normal">
                      {row.cells[column.id] ?? ""}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
