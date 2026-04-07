"use client";

import type { ElementEditorProps } from "@/modules/elements/framework/registry";
import { useAutoSave } from "@/modules/elements/hooks/use-auto-save";
import type {
  DirectoryColumn,
  DirectoryColumnType,
  DirectoryContent,
  DirectoryRow,
} from "@baseblocks/types/elements";
import { Button } from "@baseblocks/ui/button";
import { Input } from "@baseblocks/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@baseblocks/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@baseblocks/ui/table";
import {
  ChevronLeft,
  ChevronRight,
  Globe,
  Mail,
  Phone,
  Plus,
  Text,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useRef, useState } from "react";
import { csvToDirectoryContent, parseCSV } from "./csv-utils";

const COLUMN_TYPE_OPTIONS: {
  value: DirectoryColumnType;
  label: string;
  icon: typeof Text;
}[] = [
  { value: "text", label: "Text", icon: Text },
  { value: "email", label: "Email", icon: Mail },
  { value: "phone", label: "Phone", icon: Phone },
  { value: "url", label: "URL", icon: Globe },
];

const COLUMN_TYPE_PLACEHOLDERS: Record<DirectoryColumnType, string> = {
  text: "...",
  email: "email@example.com",
  phone: "+33 1 23 45 67 89",
  url: "example.com",
};

export function DirectoryEditor({
  content,
  onUpdate,
  onSaveStatusChange,
}: ElementEditorProps<"directory">) {
  const [localContent, setLocalContent] = useState<DirectoryContent>(
    () => content,
  );
  const [editingHeaderId, setEditingHeaderId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const save = useAutoSave(onUpdate, onSaveStatusChange);

  const pageSize = localContent.settings.pageSize;
  const totalPages = Math.max(
    1,
    Math.ceil(localContent.rows.length / pageSize),
  );
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const paginatedRows = localContent.rows.slice(
    startIndex,
    startIndex + pageSize,
  );

  const updateContent = (newContent: DirectoryContent) => {
    setLocalContent(newContent);
    onSaveStatusChange?.("pending");
    save(newContent);
  };

  const addColumn = () => {
    const newCol: DirectoryColumn = {
      id: `col-${Date.now()}`,
      header: "New Column",
      type: "text",
    };
    updateContent({
      ...localContent,
      columns: [...localContent.columns, newCol],
    });
    setEditingHeaderId(newCol.id);
  };

  const removeColumn = (colId: string) => {
    const newRows = localContent.rows.map((row) => {
      const nextCells = { ...row.cells };
      delete nextCells[colId];
      return { ...row, cells: nextCells };
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

  const updateColumnType = (colId: string, type: DirectoryColumnType) => {
    updateContent({
      ...localContent,
      columns: localContent.columns.map((c) =>
        c.id === colId ? { ...c, type } : c,
      ),
    });
  };

  const addRow = () => {
    const newRow: DirectoryRow = {
      id: `row-${Date.now()}`,
      cells: {},
    };
    const newRowCount = localContent.rows.length + 1;
    const newLastPage = Math.ceil(newRowCount / pageSize);
    updateContent({
      ...localContent,
      rows: [...localContent.rows, newRow],
    });
    setCurrentPage(newLastPage);
  };

  const removeRow = (rowId: string) => {
    const newRows = localContent.rows.filter((r) => r.id !== rowId);
    const newTotalPages = Math.max(1, Math.ceil(newRows.length / pageSize));
    if (safeCurrentPage > newTotalPages) setCurrentPage(newTotalPages);
    updateContent({ ...localContent, rows: newRows });
  };

  const updateCell = (rowId: string, colId: string, value: string) => {
    updateContent({
      ...localContent,
      rows: localContent.rows.map((r) =>
        r.id === rowId ? { ...r, cells: { ...r.cells, [colId]: value } } : r,
      ),
    });
  };

  const handleCSVImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so the same file can be re-selected
    e.target.value = "";

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result;
      if (typeof text !== "string") return;

      const { headers, rows } = parseCSV(text);
      if (headers.length === 0) return;

      const hasExistingData = localContent.columns.length > 0;
      if (
        hasExistingData &&
        !window.confirm(
          "Importing a CSV will replace all existing columns and rows. Continue?",
        )
      ) {
        return;
      }

      const newContent = csvToDirectoryContent(
        headers,
        rows,
        localContent.settings,
      );
      updateContent(newContent);
    };
    reader.readAsText(file);
  };

  // Empty state
  if (localContent.columns.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-muted-foreground/30 p-6 flex flex-col items-center gap-2 text-center">
        <p className="text-sm text-muted-foreground">
          No columns yet. Add a column to start building your directory.
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={handleCSVImport}
        />
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={addColumn}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Add Column
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-3.5 w-3.5 mr-1.5" />
            Import CSV
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              {localContent.columns.map((col) => {
                const colType = col.type ?? "text";
                const TypeIcon =
                  COLUMN_TYPE_OPTIONS.find((o) => o.value === colType)?.icon ??
                  Text;
                return (
                  <TableHead key={col.id} className="relative group">
                    {editingHeaderId === col.id ? (
                      <div className="flex items-center gap-1">
                        <Input
                          value={col.header}
                          onChange={(e) =>
                            updateColumnHeader(col.id, e.target.value)
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === "Escape")
                              setEditingHeaderId(null);
                          }}
                          className="h-7 text-xs font-medium"
                        />
                        <Select
                          value={colType}
                          onValueChange={(v) =>
                            updateColumnType(col.id, v as DirectoryColumnType)
                          }
                        >
                          <SelectTrigger className="h-7 w-[90px] text-xs shrink-0">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {COLUMN_TYPE_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                <span className="flex items-center gap-1.5">
                                  <opt.icon className="h-3 w-3" />
                                  {opt.label}
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <TypeIcon className="h-3 w-3 shrink-0 text-muted-foreground" />
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
                );
              })}
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
            {paginatedRows.map((row) => (
              <TableRow key={row.id}>
                {localContent.columns.map((col) => (
                  <TableCell key={col.id} className="p-1">
                    <Input
                      value={row.cells[col.id] ?? ""}
                      onChange={(e) =>
                        updateCell(row.id, col.id, e.target.value)
                      }
                      placeholder={COLUMN_TYPE_PLACEHOLDERS[col.type ?? "text"]}
                      type={col.type === "email" ? "email" : "text"}
                      className="h-8 text-sm border-transparent bg-transparent shadow-none focus-visible:border-input focus-visible:bg-background"
                    />
                  </TableCell>
                ))}
                <TableCell className="w-10 p-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
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
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={handleCSVImport}
      />
      {localContent.rows.length > pageSize && (
        <div className="flex items-center justify-between px-1">
          <Button
            variant="outline"
            size="sm"
            disabled={safeCurrentPage <= 1}
            onClick={() => setCurrentPage((p) => p - 1)}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {safeCurrentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={safeCurrentPage >= totalPages}
            onClick={() => setCurrentPage((p) => p + 1)}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={addRow}
          className="flex-1 border-dashed"
        >
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          Add Row
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="h-3.5 w-3.5 mr-1.5" />
          Import CSV
        </Button>
      </div>
    </div>
  );
}
