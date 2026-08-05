"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowDownToLineIcon,
  ArrowLeftToLineIcon,
  ArrowRightToLineIcon,
  ArrowUpToLineIcon,
  Cancel01Icon,
  Copy01Icon,
  Delete01Icon,
  DragDropHorizontalIcon,
  DragDropVerticalIcon,
  FilePasteIcon,
  MoreHorizontalIcon,
  CogIcon,
  TaskDone01Icon,
} from "@hugeicons/core-free-icons";
import {
  DirectoryPagination,
  DirectorySearch,
  DirectorySwitcher,
  directoryCellClassName,
  useDirectoryView,
} from "@/features/openeditor/renderers/directory";
import {
  createDirectory,
  directoryToTsv,
  moveDirectoryItem,
} from "@/features/openeditor/renderers/directory-model";
import type {
  Directory,
  DirectoryContent,
  DirectoryRow,
} from "@baseblocks/domain";
import { Button } from "@baseblocks/ui/button";
import { Empty, EmptyHeader, EmptyTitle } from "@baseblocks/ui/empty";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@baseblocks/ui/dropdown-menu";
import { Label } from "@baseblocks/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@baseblocks/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@baseblocks/ui/select";
import { closestCenter } from "@dnd-kit/collision";
import { PointerActivationConstraints, PointerSensor } from "@dnd-kit/dom";
import { DragDropProvider, DragOverlay } from "@dnd-kit/react";
import { isSortable, useSortable } from "@dnd-kit/react/sortable";
import { useRef, useState } from "react";
import { toast } from "sonner";

const SENSORS = [
  PointerSensor.configure({
    activationConstraints: () => [
      new PointerActivationConstraints.Distance({ value: 5 }),
    ],
  }),
];
const PAGE_SIZES = [5, 10, 20, 50] as const;
const makeId = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;

type Axis = "column" | "row";
type Action = "copy" | "paste" | "before" | "after" | "remove";
type SortData = { axis: Axis; itemId: string };

function DirectoryConfig({
  onPageSizeChange,
  pageSize,
}: {
  onPageSizeChange: (pageSize: number | null) => void;
  pageSize: number | null;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          aria-label="Configure directory"
          className="shrink-0 rounded-2xl border-0 bg-card shadow-none hover:bg-muted/60"
          size="icon"
          type="button"
          variant="ghost"
        >
          <HugeiconsIcon icon={CogIcon} className="size-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-72 rounded-[1.25rem] border-sidebar-border bg-sidebar p-4 text-sidebar-foreground shadow-2xl"
      >
        <PopoverHeader className="mb-4">
          <PopoverTitle>Directory settings</PopoverTitle>
        </PopoverHeader>
        <div className="grid gap-1.5">
          <Label
            className="text-xs font-medium tracking-wide text-sidebar-foreground/55"
            htmlFor="directory-page-size"
          >
            Rows displayed
          </Label>
          <Select
            onValueChange={(value) =>
              onPageSizeChange(value === "all" ? null : Number(value))
            }
            value={pageSize === null ? "all" : String(pageSize)}
          >
            <SelectTrigger
              className="h-10 w-full rounded-[0.95rem] border-sidebar-border/80 bg-background/70 text-sidebar-foreground"
              id="directory-page-size"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-[1rem] border-sidebar-border bg-sidebar text-sidebar-foreground shadow-2xl">
              <SelectItem
                className="rounded-[0.7rem] focus:bg-sidebar-accent focus:text-sidebar-accent-foreground"
                value="all"
              >
                Show all rows
              </SelectItem>
              {PAGE_SIZES.map((size) => (
                <SelectItem
                  className="rounded-[0.7rem] focus:bg-sidebar-accent focus:text-sidebar-accent-foreground"
                  key={size}
                  value={String(size)}
                >
                  {size} rows per page
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function blankRow(columnIds: string[]): DirectoryRow {
  return {
    id: makeId("row"),
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

function insertRow(
  directory: Directory,
  targetId: string,
  after: boolean,
): Directory {
  const target = directory.rows.find((row) => row.id === targetId);
  return target
    ? {
        ...directory,
        rows: insertAt(
          directory.rows,
          target,
          blankRow(directory.columnIds),
          after,
        ),
      }
    : directory;
}

function insertColumn(
  directory: Directory,
  targetId: string,
  after: boolean,
): Directory {
  const columnId = makeId("column");
  const columnIds = insertAt(directory.columnIds, targetId, columnId, after);
  return columnIds === directory.columnIds
    ? directory
    : {
        ...directory,
        columnIds,
        rows: directory.rows.map((row) => ({
          ...row,
          cells: { ...row.cells, [columnId]: "" },
        })),
      };
}

function removeColumn(directory: Directory, columnId: string): Directory {
  return {
    ...directory,
    columnIds: directory.columnIds.filter((id) => id !== columnId),
    rows: directory.rows.map(({ cells, ...row }) => {
      const { [columnId]: _, ...nextCells } = cells;
      return { ...row, cells: nextCells };
    }),
  };
}

function pasteRow(
  directory: Directory,
  rowId: string,
  values: string[],
): Directory {
  const missing = Math.max(0, values.length - directory.columnIds.length);
  const columnIds = [
    ...directory.columnIds,
    ...Array.from({ length: missing }, () => makeId("column")),
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

function pasteColumn(
  directory: Directory,
  columnId: string,
  values: string[],
): Directory {
  const missing = Math.max(0, values.length - directory.rows.length);
  const rows = [
    ...directory.rows,
    ...Array.from({ length: missing }, () => blankRow(directory.columnIds)),
  ];
  return {
    ...directory,
    rows: rows.map((row, index) => ({
      ...row,
      cells: { ...row.cells, [columnId]: values[index] ?? "" },
    })),
  };
}

async function copyText(text: string, success: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(success);
  } catch {
    toast.error("Could not access the system clipboard");
  }
}

async function readClipboard(axis: Axis) {
  try {
    const rows = (await navigator.clipboard.readText())
      .split(/\r?\n/)
      .map((row) => row.split("\t"));
    return axis === "row" ? (rows[0] ?? []) : rows.map((row) => row[0] ?? "");
  } catch {
    toast.error("Could not access the system clipboard");
    return null;
  }
}

function SortableHandle({
  axis,
  canRemove,
  handleRef,
  index,
  onAction,
}: {
  axis: Axis;
  canRemove: boolean;
  handleRef: (element: Element | null) => void;
  index: number;
  onAction: (action: Action) => void;
}) {
  const [open, setOpen] = useState(false);
  const pointer = useRef<{ moved: boolean; x: number; y: number } | null>(null);
  const column = axis === "column";
  const BeforeIcon = column ? ArrowLeftToLineIcon : ArrowUpToLineIcon;
  const AfterIcon = column ? ArrowRightToLineIcon : ArrowDownToLineIcon;

  return (
    <DropdownMenu onOpenChange={setOpen} open={open}>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label={`${axis} ${index + 1} actions; drag to move`}
          className="cursor-grab text-muted-foreground active:cursor-grabbing"
          onClick={(event) => {
            if (event.detail === 0) setOpen(true);
          }}
          onPointerCancel={() => {
            pointer.current = null;
          }}
          onPointerDown={(event) => {
            if (event.button !== 0) return;
            pointer.current = {
              moved: false,
              x: event.clientX,
              y: event.clientY,
            };
            event.preventDefault();
          }}
          onPointerMove={(event) => {
            const start = pointer.current;
            if (
              start &&
              Math.hypot(event.clientX - start.x, event.clientY - start.y) >= 5
            ) {
              start.moved = true;
            }
          }}
          onPointerUp={() => {
            const start = pointer.current;
            pointer.current = null;
            if (start && !start.moved) {
              setOpen(true);
            }
          }}
          ref={handleRef}
          size="icon-xs"
          title="Click for actions; drag to move"
          type="button"
          variant="ghost"
        >
          {column ? (
            <HugeiconsIcon icon={DragDropHorizontalIcon} className="size-3.5" />
          ) : (
            <HugeiconsIcon icon={DragDropVerticalIcon} className="size-3.5" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={column ? "center" : "start"}>
        <DropdownMenuItem onSelect={() => onAction("copy")}>
          <HugeiconsIcon icon={Copy01Icon} />
          Copy {axis}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onAction("paste")}>
          <HugeiconsIcon icon={FilePasteIcon} />
          Paste {axis}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onAction("before")}>
          <HugeiconsIcon icon={BeforeIcon} />
          Insert {column ? "left" : "above"}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onAction("after")}>
          <HugeiconsIcon icon={AfterIcon} />
          Insert {column ? "right" : "below"}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={!canRemove}
          onSelect={() => onAction("remove")}
          variant="destructive"
        >
          <HugeiconsIcon icon={Delete01Icon} />
          Delete {axis}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function SortableColumn({
  canRemove,
  columnId,
  index,
  onAction,
  onSelectedChange,
  selected,
  selectionMode,
}: {
  canRemove: boolean;
  columnId: string;
  index: number;
  onAction: (action: Action) => void;
  onSelectedChange: () => void;
  selected: boolean;
  selectionMode: boolean;
}) {
  const sortable = useSortable<SortData>({
    id: columnId,
    index,
    group: "directory-columns",
    data: { axis: "column", itemId: columnId },
    collisionDetector: closestCenter,
    type: "directory-column",
    accept: "directory-column",
  });

  return (
    <div
      className={`flex h-8 items-center justify-center border-l first:border-0 ${
        sortable.isDropTarget ? "bg-muted/70" : ""
      } ${sortable.isDragging ? "opacity-40" : ""} ${
        selected ? "bg-primary/10" : ""
      }`}
      ref={sortable.ref}
    >
      {selectionMode ? (
        <input
          aria-label={`Select column ${index + 1}`}
          checked={selected}
          className="size-4 accent-primary"
          onChange={onSelectedChange}
          type="checkbox"
        />
      ) : (
        <SortableHandle
          axis="column"
          canRemove={canRemove}
          handleRef={sortable.handleRef}
          index={index}
          onAction={onAction}
        />
      )}
    </div>
  );
}

function SortableRow({
  canRemove,
  columnIds,
  index,
  onAction,
  onCellChange,
  onSelectedChange,
  row,
  selected,
  selectedColumnIds,
  selectionMode,
}: {
  canRemove: boolean;
  columnIds: string[];
  index: number;
  onAction: (action: Action) => void;
  onCellChange: (columnId: string, value: string) => void;
  onSelectedChange: () => void;
  row: DirectoryRow;
  selected: boolean;
  selectedColumnIds: Set<string>;
  selectionMode: boolean;
}) {
  const sortable = useSortable<SortData>({
    id: row.id,
    index,
    group: "directory-rows",
    data: { axis: "row", itemId: row.id },
    collisionDetector: closestCenter,
    type: "directory-row",
    accept: "directory-row",
  });

  return (
    <div
      className={`grid grid-cols-[2rem_minmax(0,1fr)] gap-x-2 ${
        sortable.isDropTarget ? "[&>*]:bg-muted/70" : ""
      } ${sortable.isDragging ? "opacity-40" : ""} ${
        selected ? "[&>*]:bg-primary/10" : ""
      }`}
      ref={sortable.ref}
    >
      <div className="flex items-center justify-center border-b bg-card last:border-0">
        {selectionMode ? (
          <input
            aria-label={`Select row ${index + 1}`}
            checked={selected}
            className="size-4 accent-primary"
            onChange={onSelectedChange}
            type="checkbox"
          />
        ) : (
          <SortableHandle
            axis="row"
            canRemove={canRemove}
            handleRef={sortable.handleRef}
            index={index}
            onAction={onAction}
          />
        )}
      </div>
      <div
        className="grid min-w-0 divide-x border-b bg-card"
        style={{
          gridTemplateColumns: `repeat(${columnIds.length}, minmax(0, 1fr))`,
        }}
      >
        {columnIds.map((columnId, columnIndex) => (
          <div
            className={`${directoryCellClassName} min-w-0 p-1.5 ${
              selectedColumnIds.has(columnId) ? "bg-primary/10" : ""
            }`}
            key={columnId}
          >
            <textarea
              aria-label={`Column ${columnIndex + 1} value`}
              className="field-sizing-content min-h-8 w-full resize-none border-0 bg-transparent py-1 leading-5 outline-none [overflow-wrap:anywhere]"
              onChange={(event) => onCellChange(columnId, event.target.value)}
              rows={1}
              value={row.cells[columnId] ?? ""}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function DirectoryDragPreview({
  axis,
  columnIds,
  itemId,
  rows,
  width,
}: SortData & {
  columnIds: string[];
  rows: DirectoryRow[];
  width?: number;
}) {
  if (axis === "column") {
    return (
      <div
        className="max-h-[min(32rem,70vh)] overflow-hidden rounded-2xl bg-card text-sm shadow-2xl ring-1 ring-border"
        style={{ width }}
      >
        <div className="flex h-8 items-center justify-center border-b text-muted-foreground">
          <HugeiconsIcon icon={DragDropHorizontalIcon} className="size-3.5" />
        </div>
        {rows.map((row) => (
          <div className={`${directoryCellClassName} border-b`} key={row.id}>
            {row.cells[itemId] || "\u00a0"}
          </div>
        ))}
      </div>
    );
  }

  const row = rows.find(({ id }) => id === itemId);
  if (!row) return null;

  return (
    <div
      className="grid grid-cols-[2rem_minmax(0,1fr)] gap-x-2 overflow-hidden rounded-2xl shadow-2xl ring-1 ring-border"
      style={{ width }}
    >
      <div className="flex items-center justify-center bg-card text-muted-foreground">
        <HugeiconsIcon icon={DragDropVerticalIcon} className="size-3.5" />
      </div>
      <div
        className="grid min-w-0 divide-x bg-card text-sm"
        style={{
          gridTemplateColumns: `repeat(${columnIds.length}, minmax(0, 1fr))`,
        }}
      >
        {columnIds.map((columnId) => (
          <div className={directoryCellClassName} key={columnId}>
            {row.cells[columnId] || "\u00a0"}
          </div>
        ))}
      </div>
    </div>
  );
}

function DirectoryGrid({
  onChange,
  value,
}: {
  onChange: (value: Directory) => void;
  value: Directory;
}) {
  const view = useDirectoryView(value);
  const [previewColumnIds, setPreviewColumnIds] = useState<string[] | null>(
    null,
  );
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [selectedColumnIds, setSelectedColumnIds] = useState<Set<string>>(
    () => new Set(),
  );
  const previewColumnIdsRef = useRef<string[] | null>(null);
  const columnIds = previewColumnIds ?? value.columnIds;
  const selectedCount = selectedRowIds.size + selectedColumnIds.size;
  const itemCount = value.rows.length + value.columnIds.length;
  const toggleSelection = (
    id: string,
    setSelectedIds: (
      value: Set<string> | ((current: Set<string>) => Set<string>),
    ) => void,
  ) =>
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const startSelection = () => {
    setSelectedRowIds(new Set());
    setSelectedColumnIds(new Set());
    setSelectionMode(true);
  };
  const cancelSelection = () => {
    setSelectedRowIds(new Set());
    setSelectedColumnIds(new Set());
    setSelectionMode(false);
  };
  const selectAll = () => {
    setSelectedRowIds(new Set(value.rows.map(({ id }) => id)));
    setSelectedColumnIds(new Set(value.columnIds));
  };
  const deleteSelected = () => {
    if (selectedCount === 0) return;

    const remainingColumnIds = value.columnIds.filter(
      (id) => !selectedColumnIds.has(id),
    );
    const nextColumnIds = remainingColumnIds.length
      ? remainingColumnIds
      : [makeId("column")];
    const remainingRows = value.rows
      .filter(({ id }) => !selectedRowIds.has(id))
      .map((row) => ({
        ...row,
        cells: Object.fromEntries(
          nextColumnIds.map((id) => [id, row.cells[id] ?? ""]),
        ),
      }));

    view.setPage(1);
    onChange({
      ...value,
      columnIds: nextColumnIds,
      rows: remainingRows.length ? remainingRows : [blankRow(nextColumnIds)],
    });
    cancelSelection();
  };
  const updateCell = (rowId: string, columnId: string, cell: string) =>
    onChange({
      ...value,
      rows: value.rows.map((row) =>
        row.id === rowId
          ? { ...row, cells: { ...row.cells, [columnId]: cell } }
          : row,
      ),
    });
  const copyRow = (row: DirectoryRow) => {
    const values = value.columnIds.map((id) => row.cells[id] ?? "");
    void copyText(values.join("\t"), "Row copied");
  };
  const copyColumn = (columnId: string) => {
    const values = value.rows.map((row) => row.cells[columnId] ?? "");
    void copyText(values.join("\n"), "Column copied");
  };
  const rowAction = (row: DirectoryRow, action: Action) => {
    if (action === "copy") return copyRow(row);
    if (action === "paste") {
      void readClipboard("row").then((values) => {
        if (values) onChange(pasteRow(value, row.id, values));
      });
      return;
    }
    if (action === "remove") {
      onChange({
        ...value,
        rows: value.rows.filter(({ id }) => id !== row.id),
      });
      return;
    }
    if (action === "before" || action === "after") {
      onChange(insertRow(value, row.id, action === "after"));
    }
  };
  const columnAction = (columnId: string, action: Action) => {
    if (action === "copy") return copyColumn(columnId);
    if (action === "paste") {
      void readClipboard("column").then((values) => {
        if (values) onChange(pasteColumn(value, columnId, values));
      });
      return;
    }
    if (action === "remove") {
      onChange(removeColumn(value, columnId));
      return;
    }
    if (action === "before" || action === "after") {
      onChange(insertColumn(value, columnId, action === "after"));
    }
  };

  return (
    <section className="flex items-start gap-2">
      <div className="min-w-0 flex-1 space-y-3">
        {value.rows.length > 5 ? (
          <DirectorySearch
            onQueryChange={view.updateQuery}
            query={view.query}
          />
        ) : null}
        <DragDropProvider
          sensors={SENSORS}
          onDragStart={(event) => {
            const data = event.operation.source?.data as SortData | undefined;
            if (data?.axis !== "column") return;
            previewColumnIdsRef.current = value.columnIds;
            setPreviewColumnIds(value.columnIds);
          }}
          onDragOver={(event) => {
            const source = event.operation.source;
            const target = event.operation.target;
            const sourceData = source?.data as SortData | undefined;
            const targetData = target?.data as SortData | undefined;
            if (
              sourceData?.axis !== "column" ||
              targetData?.axis !== "column"
            ) {
              return;
            }

            event.preventDefault();
            const current = previewColumnIdsRef.current ?? value.columnIds;
            const next = moveDirectoryItem(
              current,
              sourceData.itemId,
              targetData.itemId,
            );
            if (next === current) return;
            previewColumnIdsRef.current = next;
            setPreviewColumnIds(next);
          }}
          onDragEnd={(event) => {
            const source = event.operation.source;
            const data = source?.data as SortData | undefined;

            if (data?.axis === "column") {
              const next = previewColumnIdsRef.current;
              previewColumnIdsRef.current = null;
              setPreviewColumnIds(null);
              if (!event.canceled && next && next !== value.columnIds) {
                onChange({ ...value, columnIds: next });
              }
              return;
            }

            if (
              event.canceled ||
              data?.axis !== "row" ||
              !isSortable(source) ||
              source.initialIndex === source.index
            ) {
              return;
            }
            const targetRow = view.rows[source.index];
            if (!targetRow) return;
            onChange({
              ...value,
              rows: moveDirectoryItem(value.rows, data.itemId, targetRow.id),
            });
          }}
        >
          <div className="grid grid-cols-[2rem_minmax(0,1fr)] gap-x-2">
            <div className="flex h-8 items-center justify-center rounded-2xl bg-card">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    aria-label="Directory actions"
                    size="icon-xs"
                    type="button"
                    variant="ghost"
                  >
                    <HugeiconsIcon
                      icon={MoreHorizontalIcon}
                      className="size-3.5"
                    />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-52">
                  {selectionMode ? (
                    <>
                      <DropdownMenuLabel className="text-xs text-muted-foreground">
                        {selectedCount} selected
                      </DropdownMenuLabel>
                      <DropdownMenuItem onSelect={selectAll}>
                        <HugeiconsIcon icon={TaskDone01Icon} />
                        Select all
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        disabled={selectedCount === 0}
                        onSelect={deleteSelected}
                        variant="destructive"
                      >
                        <HugeiconsIcon icon={Delete01Icon} />
                        Delete selected
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onSelect={cancelSelection}>
                        <HugeiconsIcon icon={Cancel01Icon} />
                        Cancel selection
                      </DropdownMenuItem>
                    </>
                  ) : (
                    <>
                      <DropdownMenuItem
                        onSelect={() =>
                          void copyText(
                            directoryToTsv(value),
                            "Directory copied",
                          )
                        }
                      >
                        <HugeiconsIcon icon={Copy01Icon} />
                        Copy directory
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        disabled={itemCount === 0}
                        onSelect={startSelection}
                      >
                        <HugeiconsIcon icon={TaskDone01Icon} />
                        Select rows and columns
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div
              className="grid overflow-hidden rounded-2xl bg-card"
              style={{
                gridTemplateColumns: `repeat(${columnIds.length}, minmax(0, 1fr))`,
              }}
            >
              {columnIds.map((columnId, index) => (
                <SortableColumn
                  canRemove={columnIds.length > 1}
                  columnId={columnId}
                  index={index}
                  key={columnId}
                  onAction={(action) => columnAction(columnId, action)}
                  onSelectedChange={() =>
                    toggleSelection(columnId, setSelectedColumnIds)
                  }
                  selected={selectedColumnIds.has(columnId)}
                  selectionMode={selectionMode}
                />
              ))}
            </div>
          </div>
          <div className="mt-2 overflow-hidden rounded-2xl">
            {view.rows.length ? (
              view.rows.map((row, index) => (
                <SortableRow
                  canRemove={value.rows.length > 1}
                  columnIds={columnIds}
                  index={index}
                  key={row.id}
                  onAction={(action) => rowAction(row, action)}
                  onCellChange={(columnId, cell) =>
                    updateCell(row.id, columnId, cell)
                  }
                  onSelectedChange={() =>
                    toggleSelection(row.id, setSelectedRowIds)
                  }
                  row={row}
                  selected={selectedRowIds.has(row.id)}
                  selectedColumnIds={selectedColumnIds}
                  selectionMode={selectionMode}
                />
              ))
            ) : (
              <Empty className="min-h-32 rounded-none bg-card p-4">
                <EmptyHeader>
                  <EmptyTitle className="font-normal text-muted-foreground">
                    {view.query ? "No rows found" : "No rows yet"}
                  </EmptyTitle>
                </EmptyHeader>
              </Empty>
            )}
          </div>
          <DragOverlay dropAnimation={null}>
            {(source) => {
              const data = source.data as SortData;
              return (
                <DirectoryDragPreview
                  {...data}
                  columnIds={columnIds}
                  rows={view.rows}
                  width={source.element?.getBoundingClientRect().width}
                />
              );
            }}
          </DragOverlay>
        </DragDropProvider>
        <DirectoryPagination
          currentPage={view.currentPage}
          onPageChange={view.setPage}
          pageCount={view.pageCount}
        />
      </div>
      <DirectoryConfig
        onPageSizeChange={(pageSize) => {
          view.setPage(1);
          onChange({ ...value, pageSize });
        }}
        pageSize={value.pageSize}
      />
    </section>
  );
}

export function DirectoryEditor({
  onChange,
  value,
}: {
  onChange: (value: DirectoryContent) => void;
  value: DirectoryContent;
}) {
  const [activeId, setActiveId] = useState(
    value.directories[0]?.id ?? "default",
  );
  const active =
    value.directories.find(({ id }) => id === activeId) ?? value.directories[0];
  if (!active) return null;

  const updateActive = (directory: Directory) =>
    onChange({
      ...value,
      directories: value.directories.map((item) =>
        item.id === directory.id ? directory : item,
      ),
    });
  const add = () => {
    const directory = createDirectory(
      makeId("directory"),
      `Directory ${value.directories.length + 1}`,
      makeId("column"),
      makeId("row"),
    );
    onChange({ ...value, directories: [...value.directories, directory] });
    setActiveId(directory.id);
  };
  const duplicate = () => {
    const columnIds = active.columnIds.map(() => makeId("column"));
    const directory: Directory = {
      ...active,
      id: makeId("directory"),
      label: `${active.label} copy`,
      columnIds,
      rows: active.rows.map((row) => ({
        id: makeId("row"),
        cells: Object.fromEntries(
          columnIds.map((id, index) => [
            id,
            row.cells[active.columnIds[index] ?? ""] ?? "",
          ]),
        ),
      })),
    };
    onChange({ ...value, directories: [...value.directories, directory] });
    setActiveId(directory.id);
  };
  const remove = () => {
    if (value.directories.length === 1) return;
    const index = value.directories.indexOf(active);
    const directories = value.directories.filter(({ id }) => id !== active.id);
    const next = directories[Math.min(index, directories.length - 1)];
    if (!next) return;
    onChange({ ...value, directories });
    setActiveId(next.id);
  };

  return (
    <div className="not-prose my-4 space-y-3">
      <DirectorySwitcher
        activeDirectoryId={active.id}
        directories={value.directories}
        onAdd={add}
        onDuplicate={duplicate}
        onRemove={remove}
        onRename={(id, label) =>
          onChange({
            directories: value.directories.map((directory) =>
              directory.id === id ? { ...directory, label } : directory,
            ),
          })
        }
        onSelect={setActiveId}
      />
      <DirectoryGrid key={active.id} onChange={updateActive} value={active} />
    </div>
  );
}
