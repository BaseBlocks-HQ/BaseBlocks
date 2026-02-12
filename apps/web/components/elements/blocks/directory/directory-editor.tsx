"use client";

import type { ElementEditorProps } from "@/components/elements/registry";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useDebounceCallback } from "@/hooks";
import type {
  DirectoryColumn,
  DirectoryContent,
  DirectoryRow,
} from "@/types/elements";
import { Plus, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

export function DirectoryEditor({
  id,
  content,
  onUpdate,
  onSaveStatusChange,
}: ElementEditorProps<"directory">) {
  const [localContent, setLocalContent] = useState<DirectoryContent>(content);
  const [editingHeaderId, setEditingHeaderId] = useState<string | null>(null);

  const debouncedSave = useDebounceCallback(
    useCallback(
      async (newContent: DirectoryContent) => {
        onSaveStatusChange?.("saving");
        try {
          await onUpdate(newContent);
          onSaveStatusChange?.("saved");
        } catch (error) {
          console.error("Failed to save directory:", error);
          onSaveStatusChange?.("idle");
        }
      },
      [onUpdate, onSaveStatusChange],
    ),
    500,
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: Reset local state only when block id changes
  useEffect(() => {
    setLocalContent(content);
  }, [id]);

  const updateContent = useCallback(
    (newContent: DirectoryContent) => {
      setLocalContent(newContent);
      onSaveStatusChange?.("pending");
      debouncedSave(newContent);
    },
    [debouncedSave, onSaveStatusChange],
  );

  const addColumn = () => {
    const newCol: DirectoryColumn = {
      id: `col-${Date.now()}`,
      header: "New Column",
    };
    updateContent({
      ...localContent,
      columns: [...localContent.columns, newCol],
    });
    setEditingHeaderId(newCol.id);
  };

  const removeColumn = (colId: string) => {
    const newRows = localContent.rows.map((row) => {
      const { [colId]: _, ...rest } = row.cells;
      return { ...row, cells: rest };
    });
    updateContent({
      ...localContent,
      columns: localContent.columns.filter((c) => c.id !== colId),
      rows: newRows,
    });
    if (editingHeaderId === colId) setEditingHeaderId(null);
  };

  const updateColumnHeader = (colId: string, header: string) => {
    updateContent({
      ...localContent,
      columns: localContent.columns.map((c) =>
        c.id === colId ? { ...c, header } : c,
      ),
    });
  };

  const addRow = () => {
    const newRow: DirectoryRow = {
      id: `row-${Date.now()}`,
      cells: {},
    };
    updateContent({
      ...localContent,
      rows: [...localContent.rows, newRow],
    });
  };

  const removeRow = (rowId: string) => {
    updateContent({
      ...localContent,
      rows: localContent.rows.filter((r) => r.id !== rowId),
    });
  };

  const updateCell = (rowId: string, colId: string, value: string) => {
    updateContent({
      ...localContent,
      rows: localContent.rows.map((r) =>
        r.id === rowId ? { ...r, cells: { ...r.cells, [colId]: value } } : r,
      ),
    });
  };

  // Empty state
  if (localContent.columns.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-muted-foreground/30 p-6 flex flex-col items-center gap-2 text-center">
        <p className="text-sm text-muted-foreground">
          No columns yet. Add a column to start building your directory.
        </p>
        <Button variant="outline" size="sm" onClick={addColumn}>
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          Add Column
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              {localContent.columns.map((col) => (
                <TableHead key={col.id} className="relative group">
                  {editingHeaderId === col.id ? (
                    <div className="flex items-center gap-1">
                      <Input
                        value={col.header}
                        onChange={(e) =>
                          updateColumnHeader(col.id, e.target.value)
                        }
                        onBlur={() => setEditingHeaderId(null)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") setEditingHeaderId(null);
                        }}
                        className="h-7 text-xs font-medium"
                        autoFocus
                      />
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        className="cursor-pointer text-left flex-1 min-w-0 truncate"
                        onClick={() => setEditingHeaderId(col.id)}
                      >
                        {col.header || "Untitled"}
                      </button>
                      <button
                        type="button"
                        className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 p-0.5 rounded hover:bg-muted"
                        onClick={() => removeColumn(col.id)}
                      >
                        <X className="h-3 w-3 text-muted-foreground" />
                      </button>
                    </div>
                  )}
                </TableHead>
              ))}
              <TableHead className="w-10">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={addColumn}
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {localContent.rows.map((row) => (
              <TableRow key={row.id} className="group">
                {localContent.columns.map((col) => (
                  <TableCell key={col.id} className="p-1">
                    <Input
                      value={row.cells[col.id] ?? ""}
                      onChange={(e) =>
                        updateCell(row.id, col.id, e.target.value)
                      }
                      placeholder="..."
                      className="h-8 text-sm border-transparent bg-transparent shadow-none focus-visible:border-input focus-visible:bg-background"
                    />
                  </TableCell>
                ))}
                <TableCell className="w-10 p-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                    onClick={() => removeRow(row.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={addRow}
        className="w-full border-dashed"
      >
        <Plus className="h-3.5 w-3.5 mr-1.5" />
        Add Row
      </Button>
    </div>
  );
}
