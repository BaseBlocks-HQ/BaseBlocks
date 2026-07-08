"use client";

import type { ElementEditorProps } from "@/modules/site-elements/registry";
import { useAutoSave } from "@/modules/editor/shared/use-auto-save";
import type {
  DirectoryColumn,
  DirectoryColumnType,
  DirectoryContent,
  DirectoryRow,
} from "@baseblocks/domain/elements";
import { Button } from "@baseblocks/ui/button";
import { Input } from "@baseblocks/ui/input";
import { cn } from "@baseblocks/ui/lib/utils";
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
  closestCenter,
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  restrictToHorizontalAxis,
  restrictToVerticalAxis,
} from "@dnd-kit/modifiers";
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ChevronLeft,
  ChevronRight,
  Globe,
  GripVertical,
  Mail,
  Phone,
  Plus,
  Search,
  Text,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { csvToDirectoryContent, parseCSV } from "./csv-utils";

const COLUMN_DRAG_PREFIX = "column:";
const ROW_DRAG_PREFIX = "row:";

function getPaginatedItems<T>(
  items: T[],
  pageSize: number,
  currentPage: number,
) {
  if (pageSize <= 0) {
    return {
      pageSize: Math.max(items.length, 1),
      totalPages: 1,
      safeCurrentPage: 1,
      paginatedItems: items,
    };
  }

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;

  return {
    pageSize,
    totalPages,
    safeCurrentPage,
    paginatedItems: items.slice(startIndex, startIndex + pageSize),
  };
}

function DragHandleButton({
  attributes,
  listeners,
  className,
}: {
  attributes: ReturnType<typeof useSortable>["attributes"];
  listeners: ReturnType<typeof useSortable>["listeners"];
  className?: string;
}) {
  return (
    <button
      type="button"
      {...attributes}
      {...listeners}
      className={cn(
        "inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted cursor-grab active:cursor-grabbing",
        className,
      )}
      aria-label="Drag to reorder"
    >
      <GripVertical className="h-3.5 w-3.5" />
    </button>
  );
}

function SortableColumnHead({
  column,
  isEditing,
  onStartEdit,
  onStopEdit,
  onUpdateHeader,
  onUpdateType,
  onRemove,
}: {
  column: DirectoryColumn;
  isEditing: boolean;
  onStartEdit: () => void;
  onStopEdit: () => void;
  onUpdateHeader: (header: string) => void;
  onUpdateType: (type: DirectoryColumnType) => void;
  onRemove: () => void;
}) {
  const sortable = useSortable({
    id: `${COLUMN_DRAG_PREFIX}${column.id}`,
  });

  const style = {
    transform: CSS.Transform.toString(sortable.transform),
    transition: sortable.transition,
  };

  const colType = column.type ?? "text";
  const TypeIcon =
    COLUMN_TYPE_OPTIONS.find((option) => option.value === colType)?.icon ??
    Text;

  return (
    <TableHead
      ref={sortable.setNodeRef}
      style={style}
      className={cn(
        "relative h-10 min-w-[12rem] align-middle",
        sortable.isDragging && "z-10 bg-background opacity-80 shadow-sm",
      )}
    >
      <div className="flex h-8 items-center gap-1">
        <DragHandleButton
          attributes={sortable.attributes}
          listeners={sortable.listeners}
          className="h-7 w-7 shrink-0"
        />
        {isEditing ? (
          <div className="flex min-w-0 flex-1 items-center gap-1">
            <Input
              value={column.header}
              onChange={(e) => onUpdateHeader(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === "Escape") onStopEdit();
              }}
              className="h-7 text-xs font-medium"
            />
            <Select
              value={colType}
              onValueChange={(value) =>
                onUpdateType(value as DirectoryColumnType)
              }
            >
              <SelectTrigger className="h-7 w-[90px] shrink-0 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COLUMN_TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <span className="flex items-center gap-1.5">
                      <option.icon className="h-3 w-3" />
                      {option.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <div className="group flex min-w-0 flex-1 items-center gap-1">
            <TypeIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <button
              type="button"
              className="min-w-0 flex-1 cursor-pointer truncate text-left"
              onClick={onStartEdit}
              title={column.header || "Untitled"}
            >
              {column.header || "Untitled"}
            </button>
            <button
              type="button"
              className="shrink-0 rounded p-0.5 opacity-0 transition-opacity hover:bg-muted group-hover:opacity-100"
              onClick={onRemove}
            >
              <X className="h-3 w-3 text-muted-foreground" />
            </button>
          </div>
        )}
      </div>
    </TableHead>
  );
}

function SortableDirectoryRow({
  row,
  columns,
  onUpdateCell,
  onRemoveRow,
}: {
  row: DirectoryRow;
  columns: DirectoryColumn[];
  onUpdateCell: (colId: string, value: string) => void;
  onRemoveRow: () => void;
}) {
  const sortable = useSortable({
    id: `${ROW_DRAG_PREFIX}${row.id}`,
  });

  const style = {
    transform: CSS.Transform.toString(sortable.transform),
    transition: sortable.transition,
  };

  return (
    <TableRow
      ref={sortable.setNodeRef}
      style={style}
      className={cn(
        sortable.isDragging && "z-10 bg-background opacity-80 shadow-sm",
      )}
    >
      <TableCell className="w-10 p-1 align-top">
        <DragHandleButton
          attributes={sortable.attributes}
          listeners={sortable.listeners}
        />
      </TableCell>
      {columns.map((col) => (
        <TableCell
          key={col.id}
          className="min-w-[12rem] p-1 align-top whitespace-normal"
        >
          <Input
            value={row.cells[col.id] ?? ""}
            onChange={(e) => onUpdateCell(col.id, e.target.value)}
            placeholder={COLUMN_TYPE_PLACEHOLDERS[col.type ?? "text"]}
            type={col.type === "email" ? "email" : "text"}
            className="h-8 border-transparent bg-transparent text-sm shadow-none focus-visible:border-input focus-visible:bg-background"
          />
        </TableCell>
      ))}
      <TableCell className="w-10 p-1 align-top">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-destructive"
          onClick={onRemoveRow}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </TableCell>
    </TableRow>
  );
}

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
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [activeDragKind, setActiveDragKind] = useState<"column" | "row" | null>(
    null,
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const save = useAutoSave(onUpdate, onSaveStatusChange);
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 5 },
    }),
    useSensor(KeyboardSensor),
  );

  const filteredRows = (() => {
    if (!searchQuery.trim()) return localContent.rows;
    const query = searchQuery.toLowerCase();
    return localContent.rows.filter((row) =>
      localContent.columns.some((col) =>
        (row.cells[col.id] ?? "").toLowerCase().includes(query),
      ),
    );
  })();
  const {
    pageSize,
    totalPages,
    safeCurrentPage,
    paginatedItems: paginatedRows,
  } = getPaginatedItems(
    filteredRows,
    localContent.settings.pageSize,
    currentPage,
  );

  useEffect(() => {
    setLocalContent(content);
  }, [content]);

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

  const reorderColumns = (activeId: string, overId: string) => {
    const oldIndex = localContent.columns.findIndex(
      (col) => col.id === activeId,
    );
    const newIndex = localContent.columns.findIndex((col) => col.id === overId);

    if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return;

    updateContent({
      ...localContent,
      columns: arrayMove(localContent.columns, oldIndex, newIndex),
    });
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
    const newLastPage =
      localContent.settings.pageSize <= 0
        ? 1
        : Math.ceil(newRowCount / localContent.settings.pageSize);
    updateContent({
      ...localContent,
      rows: [...localContent.rows, newRow],
    });
    setCurrentPage(newLastPage);
  };

  const removeRow = (rowId: string) => {
    const newRows = localContent.rows.filter((r) => r.id !== rowId);
    const newTotalPages =
      localContent.settings.pageSize <= 0
        ? 1
        : Math.max(
            1,
            Math.ceil(newRows.length / localContent.settings.pageSize),
          );
    if (safeCurrentPage > newTotalPages) setCurrentPage(newTotalPages);
    updateContent({ ...localContent, rows: newRows });
  };

  const reorderRows = (activeId: string, overId: string) => {
    const oldIndex = localContent.rows.findIndex((row) => row.id === activeId);
    const newIndex = localContent.rows.findIndex((row) => row.id === overId);

    if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return;

    updateContent({
      ...localContent,
      rows: arrayMove(localContent.rows, oldIndex, newIndex),
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

  const handleColumnDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    reorderColumns(
      String(active.id).replace(COLUMN_DRAG_PREFIX, ""),
      String(over.id).replace(COLUMN_DRAG_PREFIX, ""),
    );
  };

  const handleRowDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    reorderRows(
      String(active.id).replace(ROW_DRAG_PREFIX, ""),
      String(over.id).replace(ROW_DRAG_PREFIX, ""),
    );
  };

  const handleDragStart = (event: DragStartEvent) => {
    const activeId = String(event.active.id);

    if (activeId.startsWith(COLUMN_DRAG_PREFIX)) {
      setActiveDragKind("column");
      return;
    }

    if (activeId.startsWith(ROW_DRAG_PREFIX)) {
      setActiveDragKind("row");
      return;
    }

    setActiveDragKind(null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const activeId = String(event.active.id);

    if (activeId.startsWith(COLUMN_DRAG_PREFIX)) {
      handleColumnDragEnd(event);
    } else if (activeId.startsWith(ROW_DRAG_PREFIX)) {
      handleRowDragEnd(event);
    }

    setActiveDragKind(null);
  };

  const handleDragCancel = () => {
    setActiveDragKind(null);
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
      {localContent.settings.showSearch && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search directory..."
            className="pl-9"
          />
        </div>
      )}
      <div className="rounded-lg border overflow-hidden">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={
            activeDragKind === "column"
              ? [restrictToHorizontalAxis]
              : activeDragKind === "row"
                ? [restrictToVerticalAxis]
                : undefined
          }
          autoScroll={false}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <Table className="table-auto">
            <TableHeader>
              <SortableContext
                items={localContent.columns.map(
                  (col) => `${COLUMN_DRAG_PREFIX}${col.id}`,
                )}
                strategy={horizontalListSortingStrategy}
              >
                <TableRow>
                  <TableHead className="h-10 w-10 align-middle">
                    <div className="flex h-8 items-center justify-center" />
                  </TableHead>
                  {localContent.columns.map((col) => (
                    <SortableColumnHead
                      key={col.id}
                      column={col}
                      isEditing={editingHeaderId === col.id}
                      onStartEdit={() => setEditingHeaderId(col.id)}
                      onStopEdit={() => setEditingHeaderId(null)}
                      onUpdateHeader={(header) =>
                        updateColumnHeader(col.id, header)
                      }
                      onUpdateType={(type) => updateColumnType(col.id, type)}
                      onRemove={() => removeColumn(col.id)}
                    />
                  ))}
                  <TableHead className="h-10 w-10 align-middle">
                    <div className="flex h-8 items-center justify-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={addColumn}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableHead>
                </TableRow>
              </SortableContext>
            </TableHeader>
            <TableBody>
              <SortableContext
                items={paginatedRows.map(
                  (row) => `${ROW_DRAG_PREFIX}${row.id}`,
                )}
                strategy={verticalListSortingStrategy}
              >
                {paginatedRows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={localContent.columns.length + 2}
                      className="py-6 text-center text-muted-foreground"
                    >
                      {searchQuery ? "No results found." : "No rows yet."}
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedRows.map((row) => (
                    <SortableDirectoryRow
                      key={row.id}
                      row={row}
                      columns={localContent.columns}
                      onUpdateCell={(colId, value) =>
                        updateCell(row.id, colId, value)
                      }
                      onRemoveRow={() => removeRow(row.id)}
                    />
                  ))
                )}
              </SortableContext>
            </TableBody>
          </Table>
        </DndContext>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={handleCSVImport}
      />
      {localContent.settings.pageSize > 0 && filteredRows.length > pageSize && (
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
    </div>
  );
}
