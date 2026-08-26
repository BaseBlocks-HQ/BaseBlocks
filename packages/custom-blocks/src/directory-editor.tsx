"use client";

import {
  Add01Icon,
  ArrowDown01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  ArrowUp01Icon,
  Copy01Icon,
  Delete01Icon,
  DragDropHorizontalIcon,
  DragDropVerticalIcon,
  FilePasteIcon,
  PencilEdit01Icon,
  Search01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@baseblocks/ui/button";
import { Input } from "@baseblocks/ui/input";
import { closestCenter } from "@dnd-kit/collision";
import { PointerActivationConstraints, PointerSensor } from "@dnd-kit/dom";
import { DragDropProvider, DragOverlay } from "@dnd-kit/react";
import { isSortable, useSortable } from "@dnd-kit/react/sortable";
import { defineOpenEditorCustomBlockEditor } from "@openeditor/custom-block/editor";
import { type RefObject, useEffect, useMemo, useRef, useState } from "react";
import {
  addDirectory,
  deleteDirectoryColumns,
  deleteDirectory,
  deleteDirectoryRow,
  duplicateDirectory,
  duplicateDirectoryColumn,
  duplicateDirectoryRow,
  filterDirectoryRows,
  insertDirectoryColumn,
  insertDirectoryRow,
  moveDirectoryItem,
  pasteDirectoryColumn,
  pasteDirectoryRow,
  removeDirectoryColumn,
  renameDirectory,
  renameDirectoryColumn,
  reorderDirectories,
  type Directory,
  type DirectoryColumn,
  type DirectoryRow,
} from "./directory";
import { directoryBlock } from "./index";
import { type ActionItem, ActionMenu, BlockShell, CollectionMenu } from "./ui";

const createId = () => crypto.randomUUID();
const sensors = [
  PointerSensor.configure({
    activationConstraints: () => [
      new PointerActivationConstraints.Distance({ value: 5 }),
    ],
  }),
];

type SortData =
  | { kind: "directory-column"; id: string }
  | { kind: "directory-row"; id: string };
type DirectoryClipboard =
  | { kind: "column"; values: string[] }
  | { kind: "row"; values: string[] }
  | null;

function DragHandle({
  actions,
  axis,
  handleRef,
  index,
  name,
  suppressMenuClick,
  total,
}: {
  actions: ActionItem[];
  axis: "column" | "row";
  handleRef: (element: Element | null) => void;
  index: number;
  name?: string;
  suppressMenuClick: RefObject<boolean>;
  total: number;
}) {
  const itemLabel =
    name?.trim() || `${axis === "column" ? "Column" : "Row"} ${index + 1}`;
  const label = `Move ${itemLabel}; position ${index + 1} of ${total}`;
  return (
    <ActionMenu
      items={actions}
      label={`${itemLabel} actions`}
      trigger={
        <Button
          aria-label={`${label}. Select for actions.`}
          className="cursor-grab touch-none text-muted-foreground active:cursor-grabbing"
          onClickCapture={(event) => {
            if (!suppressMenuClick.current) return;
            event.preventDefault();
            event.stopPropagation();
            suppressMenuClick.current = false;
          }}
          ref={handleRef}
          size="icon-xs"
          title={`${label}. Select for actions.`}
          type="button"
          variant="ghost"
        >
          <HugeiconsIcon
            aria-hidden
            icon={
              axis === "column" ? DragDropHorizontalIcon : DragDropVerticalIcon
            }
          />
        </Button>
      }
    />
  );
}

function SortableColumn({
  active,
  column,
  index,
  onSelectedChange,
  selected,
  suppressMenuClick,
  clipboard,
  setClipboard,
  updateActive,
}: {
  active: Directory;
  column: DirectoryColumn;
  index: number;
  onSelectedChange: () => void;
  selected: boolean;
  suppressMenuClick: RefObject<boolean>;
  clipboard: DirectoryClipboard;
  setClipboard: (clipboard: DirectoryClipboard) => void;
  updateActive: (next: Directory) => void;
}) {
  const sortable = useSortable<SortData>({
    id: column.id,
    index,
    group: "directory-columns",
    data: { kind: "directory-column", id: column.id },
    collisionDetector: closestCenter,
    type: "directory-column",
    accept: "directory-column",
  });
  const [editingName, setEditingName] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editingName) return;
    nameInputRef.current?.focus();
    nameInputRef.current?.select();
  }, [editingName]);

  const startEditingName = () => {
    setEditingName(true);
  };
  const commitName = (value: string) => {
    const nextName = value.trim();
    if (nextName !== column.name)
      updateActive(renameDirectoryColumn(active, column.id, nextName));
    setEditingName(false);
  };
  const cancelEditingName = () => {
    setEditingName(false);
  };
  return (
    <th
      className={`min-w-44 border-l border-border/70 px-2 py-2 text-left first:border-l-0 ${selected ? "bg-primary/10" : ""} ${sortable.isDropTarget ? "bg-muted" : ""} ${sortable.isDragging ? "opacity-40" : ""}`}
      ref={sortable.ref}
      scope="col"
    >
      <div className="flex items-center gap-1">
        <input
          aria-label={`Select ${column.name.trim() || `column ${index + 1}`}`}
          checked={selected}
          className="size-4 shrink-0 accent-primary"
          onChange={onSelectedChange}
          type="checkbox"
        />
        <DragHandle
          actions={[
            {
              disabled: index === 0,
              icon: ArrowLeft01Icon,
              label: "Move left",
              onSelect: () => {
                const target = active.columns[index - 1];
                if (target)
                  updateActive({
                    ...active,
                    columns: moveDirectoryItem(
                      active.columns,
                      column.id,
                      target.id,
                    ),
                  });
              },
            },
            {
              disabled: index === active.columns.length - 1,
              icon: ArrowRight01Icon,
              label: "Move right",
              onSelect: () => {
                const target = active.columns[index + 1];
                if (target)
                  updateActive({
                    ...active,
                    columns: moveDirectoryItem(
                      active.columns,
                      column.id,
                      target.id,
                    ),
                  });
              },
            },
            {
              icon: ArrowLeft01Icon,
              label: "Insert before",
              onSelect: () =>
                updateActive(
                  insertDirectoryColumn(active, column.id, false, createId),
                ),
              separatorBefore: true,
            },
            {
              icon: ArrowRight01Icon,
              label: "Insert after",
              onSelect: () =>
                updateActive(
                  insertDirectoryColumn(active, column.id, true, createId),
                ),
            },
            {
              icon: Copy01Icon,
              label: "Duplicate column",
              onSelect: () =>
                updateActive(
                  duplicateDirectoryColumn(active, column.id, createId),
                ),
            },
            {
              icon: Copy01Icon,
              label: "Copy column",
              onSelect: () => {
                const values = active.rows.map(
                  (row) => row.cells[column.id] ?? "",
                );
                setClipboard({ kind: "column", values });
                return navigator.clipboard.writeText(values.join("\n"));
              },
              separatorBefore: true,
            },
            ...(clipboard?.kind === "column"
              ? [
                  {
                    icon: FilePasteIcon,
                    label: "Paste column",
                    onSelect: () =>
                      updateActive(
                        pasteDirectoryColumn(
                          active,
                          column.id,
                          clipboard.values,
                          createId,
                        ),
                      ),
                  },
                ]
              : []),
            {
              destructive: true,
              disabled: active.columns.length === 1,
              icon: Delete01Icon,
              label: "Delete column",
              onSelect: () =>
                updateActive(removeDirectoryColumn(active, column.id)),
              separatorBefore: true,
            },
          ]}
          axis="column"
          handleRef={sortable.handleRef}
          index={index}
          name={column.name}
          suppressMenuClick={suppressMenuClick}
          total={active.columns.length}
        />
        {editingName ? (
          <Input
            aria-label={`Name for ${column.name.trim() || `column ${index + 1}`}`}
            className="h-8 min-w-0 flex-1 rounded-lg border-0 bg-transparent px-2 text-xs font-medium text-muted-foreground shadow-none focus-visible:bg-background focus-visible:text-foreground"
            defaultValue={column.name}
            onBeforeInputCapture={(event) => event.stopPropagation()}
            onBlur={(event) => commitName(event.currentTarget.value)}
            onInputCapture={(event) => event.stopPropagation()}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                event.currentTarget.blur();
              } else if (event.key === "Escape") {
                event.preventDefault();
                cancelEditingName();
              }
            }}
            ref={nameInputRef}
          />
        ) : (
          <Button
            aria-label={`Edit ${column.name.trim() || `column ${index + 1}`} name`}
            className="h-8 min-w-0 flex-1 justify-start truncate rounded-lg px-2 text-left text-xs font-medium text-muted-foreground shadow-none hover:bg-background hover:text-foreground"
            onClick={startEditingName}
            title="Edit column name"
            type="button"
            variant="ghost"
          >
            <span className="truncate">{column.name}</span>
          </Button>
        )}
      </div>
    </th>
  );
}

function SortableRow({
  active,
  index,
  sortIndex,
  onDeleted,
  onSelectedChange,
  row,
  selected,
  suppressMenuClick,
  clipboard,
  setClipboard,
  updateActive,
}: {
  active: Directory;
  index: number;
  sortIndex: number;
  onDeleted: () => void;
  onSelectedChange: () => void;
  row: DirectoryRow;
  selected: boolean;
  suppressMenuClick: RefObject<boolean>;
  clipboard: DirectoryClipboard;
  setClipboard: (clipboard: DirectoryClipboard) => void;
  updateActive: (next: Directory) => void;
}) {
  const [cellDrafts, setCellDrafts] = useState<Record<string, string>>({});
  const sortable = useSortable<SortData>({
    id: row.id,
    index: sortIndex,
    group: "directory-rows",
    data: { kind: "directory-row", id: row.id },
    collisionDetector: closestCenter,
    type: "directory-row",
    accept: "directory-row",
  });
  return (
    <tr
      className={`group border-t border-border/60 hover:bg-muted/20 ${selected ? "bg-primary/10" : ""} ${sortable.isDropTarget ? "bg-muted" : ""} ${sortable.isDragging ? "opacity-40" : ""}`}
      ref={sortable.ref}
    >
      <th className="w-10 bg-muted/35 px-1 text-center" scope="row">
        <DragHandle
          actions={[
            {
              disabled: index === 0,
              icon: ArrowUp01Icon,
              label: "Move up",
              onSelect: () => {
                const target = active.rows[index - 1];
                if (target)
                  updateActive({
                    ...active,
                    rows: moveDirectoryItem(active.rows, row.id, target.id),
                  });
              },
            },
            {
              disabled: index === active.rows.length - 1,
              icon: ArrowDown01Icon,
              label: "Move down",
              onSelect: () => {
                const target = active.rows[index + 1];
                if (target)
                  updateActive({
                    ...active,
                    rows: moveDirectoryItem(active.rows, row.id, target.id),
                  });
              },
            },
            {
              icon: ArrowUp01Icon,
              label: "Insert above",
              onSelect: () =>
                updateActive(
                  insertDirectoryRow(active, row.id, false, createId),
                ),
              separatorBefore: true,
            },
            {
              icon: ArrowDown01Icon,
              label: "Insert below",
              onSelect: () =>
                updateActive(
                  insertDirectoryRow(active, row.id, true, createId),
                ),
            },
            {
              icon: Copy01Icon,
              label: "Duplicate row",
              onSelect: () =>
                updateActive(duplicateDirectoryRow(active, row.id, createId)),
            },
            {
              icon: Copy01Icon,
              label: "Copy row",
              onSelect: () => {
                const values = active.columns.map(
                  ({ id }) => row.cells[id] ?? "",
                );
                setClipboard({ kind: "row", values });
                return navigator.clipboard.writeText(values.join("\t"));
              },
              separatorBefore: true,
            },
            ...(clipboard?.kind === "row"
              ? [
                  {
                    icon: FilePasteIcon,
                    label: "Paste row",
                    onSelect: () =>
                      updateActive(
                        pasteDirectoryRow(
                          active,
                          row.id,
                          clipboard.values,
                          createId,
                        ),
                      ),
                  },
                ]
              : []),
            {
              destructive: true,
              disabled: active.rows.length === 1,
              icon: Delete01Icon,
              label: "Delete row",
              onSelect: () => {
                updateActive(deleteDirectoryRow(active, row.id));
                onDeleted();
              },
              separatorBefore: true,
            },
          ]}
          axis="row"
          handleRef={sortable.handleRef}
          index={index}
          suppressMenuClick={suppressMenuClick}
          total={active.rows.length}
        />
      </th>
      <td className="w-10 bg-muted/35 px-2 py-1 text-center">
        <input
          aria-label={`Select row ${index + 1}`}
          checked={selected}
          className="size-4 accent-primary"
          onChange={onSelectedChange}
          type="checkbox"
        />
      </td>
      {active.columns.map((column) => (
        <td className="border-l p-0" key={column.id}>
          <Input
            aria-label={`Row ${index + 1}, ${column.name}`}
            className="h-10 rounded-none border-0 bg-transparent px-3 shadow-none selection:text-inherit focus-visible:bg-background focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/50"
            onBlur={() =>
              setCellDrafts((current) => {
                if (!(column.id in current)) return current;
                const next = { ...current };
                delete next[column.id];
                return next;
              })
            }
            onChange={(event) => {
              const nextValue = event.target.value;
              setCellDrafts((current) => ({
                ...current,
                [column.id]: nextValue,
              }));
              updateActive({
                ...active,
                rows: active.rows.map((item) =>
                  item.id === row.id
                    ? {
                        ...item,
                        cells: {
                          ...item.cells,
                          [column.id]: nextValue,
                        },
                      }
                    : item,
                ),
              });
            }}
            value={cellDrafts[column.id] ?? row.cells[column.id] ?? ""}
          />
        </td>
      ))}
    </tr>
  );
}

export const directoryEditor = defineOpenEditorCustomBlockEditor({
  block: directoryBlock,
  render: function DirectoryEditor({ data, updateData }) {
    const updateDataJson = (value: unknown) => updateData(value as typeof data);
    const [activeId, setActiveId] = useState(data.directories[0]?.id ?? "");
    const [renaming, setRenaming] = useState(false);
    const [query, setQuery] = useState("");
    const [selectedRows, setSelectedRows] = useState<string[]>([]);
    const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
    const [clipboard, setClipboard] = useState<DirectoryClipboard>(null);
    const suppressMenuClick = useRef(false);
    const active =
      data.directories.find(({ id }) => id === activeId) ?? data.directories[0];
    const visibleRows = useMemo(
      () => (active ? filterDirectoryRows(active, query) : []),
      [active, query],
    );
    useEffect(() => {
      const visibleIds = new Set(visibleRows.map(({ id }) => id));
      setSelectedRows((current) => {
        const next = current.filter((id) => visibleIds.has(id));
        return next.length === current.length ? current : next;
      });
      const columnIds = new Set(active?.columns.map(({ id }) => id));
      setSelectedColumns((current) => {
        const next = current.filter((id) => columnIds.has(id));
        return next.length === current.length ? current : next;
      });
    }, [active, visibleRows]);
    if (!active) return null;
    const updateActive = (next: Directory) =>
      updateDataJson({
        directories: data.directories.map((item) =>
          item.id === active.id ? next : item,
        ),
      });

    return (
      <BlockShell label="Edit directory" width={data.width}>
        <div className="flex flex-wrap items-center justify-between gap-2 px-1">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            {renaming ? (
              <Input
                aria-label="Directory name"
                autoFocus
                className="min-w-36 max-w-72 bg-background font-semibold"
                defaultValue={active.label}
                onBeforeInputCapture={(event) => event.stopPropagation()}
                onBlur={(event) => {
                  const nextLabel = event.currentTarget.value;
                  if (nextLabel !== active.label) {
                    updateDataJson(renameDirectory(data, active.id, nextLabel));
                  }
                  setRenaming(false);
                }}
                onInputCapture={(event) => event.stopPropagation()}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    event.currentTarget.blur();
                  } else if (event.key === "Escape") {
                    event.preventDefault();
                    setRenaming(false);
                  }
                }}
              />
            ) : (
              <CollectionMenu
                currentId={active.id}
                items={[
                  {
                    icon: Add01Icon,
                    label: "Add directory",
                    onSelect: () => {
                      const next = addDirectory(data, createId);
                      updateDataJson(next.content);
                      setActiveId(next.activeId);
                    },
                  },
                  {
                    icon: PencilEdit01Icon,
                    label: "Rename directory",
                    onSelect: () => setRenaming(true),
                  },
                  {
                    icon: Copy01Icon,
                    label: "Duplicate directory",
                    onSelect: () => {
                      const next = duplicateDirectory(
                        data,
                        active.id,
                        createId,
                      );
                      updateDataJson(next.content);
                      setActiveId(next.activeId);
                    },
                  },
                  {
                    destructive: true,
                    disabled: data.directories.length === 1,
                    icon: Delete01Icon,
                    label: "Delete directory",
                    onSelect: () => {
                      const next = deleteDirectory(data, active.id);
                      updateDataJson(next.content);
                      setActiveId(next.activeId);
                    },
                    separatorBefore: true,
                  },
                ]}
                label="Directories"
                onChange={(id) => {
                  setActiveId(id);
                  setSelectedRows([]);
                  setSelectedColumns([]);
                }}
                onReorder={(sourceId, targetId) =>
                  updateDataJson(reorderDirectories(data, sourceId, targetId))
                }
                options={data.directories}
                valueLabel={active.label}
              />
            )}
          </div>
          {selectedRows.length > 0 || selectedColumns.length > 0 ? (
            <div className="flex min-w-0 flex-wrap items-center justify-end gap-1">
              {selectedRows.length > 0 ? (
                <>
                  <span className="px-2 text-xs font-medium text-muted-foreground tabular-nums">
                    {selectedRows.length} row
                    {selectedRows.length === 1 ? "" : "s"} selected
                  </span>
                  <Button
                    onClick={() => {
                      const next = selectedRows.reduce(
                        (directory, rowId) =>
                          deleteDirectoryRow(directory, rowId),
                        active,
                      );
                      updateActive(next);
                      setSelectedRows([]);
                    }}
                    size="sm"
                    type="button"
                    variant="ghost"
                  >
                    <HugeiconsIcon aria-hidden icon={Delete01Icon} />
                    Delete rows
                  </Button>
                </>
              ) : null}
              {selectedColumns.length > 0 ? (
                <>
                  <span className="px-2 text-xs font-medium text-muted-foreground tabular-nums">
                    {selectedColumns.length} column
                    {selectedColumns.length === 1 ? "" : "s"} selected
                  </span>
                  <Button
                    onClick={() => {
                      updateActive(
                        deleteDirectoryColumns(active, selectedColumns),
                      );
                      setSelectedColumns([]);
                    }}
                    size="sm"
                    type="button"
                    variant="ghost"
                  >
                    <HugeiconsIcon aria-hidden icon={Delete01Icon} />
                    Delete columns
                  </Button>
                </>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="relative w-full px-1">
          <HugeiconsIcon
            aria-hidden
            className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            icon={Search01Icon}
          />
          <Input
            aria-label="Search directory"
            className="rounded-2xl border-0 bg-card pl-10 shadow-none dark:bg-card"
            onChange={(event) => {
              setQuery(event.target.value);
              setSelectedRows([]);
            }}
            placeholder="Search directory"
            type="search"
            value={query}
          />
        </div>

        <DragDropProvider
          sensors={sensors}
          onDragStart={() => {
            suppressMenuClick.current = true;
          }}
          onDragEnd={(event) => {
            window.setTimeout(() => {
              suppressMenuClick.current = false;
            }, 250);
            if (event.canceled || !isSortable(event.operation.source)) return;
            const source = event.operation.source;
            const data = source.data as SortData | undefined;
            if (!data || source.initialIndex === source.index) return;
            if (data.kind === "directory-column") {
              const target = active.columns[source.index];
              if (target)
                updateActive({
                  ...active,
                  columns: moveDirectoryItem(
                    active.columns,
                    data.id,
                    target.id,
                  ),
                });
              return;
            }
            const target = visibleRows[source.index];
            if (target)
              updateActive({
                ...active,
                rows: moveDirectoryItem(active.rows, data.id, target.id),
              });
          }}
        >
          <div className="overflow-x-auto rounded-[1.5rem] bg-card">
            <table className="w-full min-w-[42rem] border-collapse text-sm">
              <caption className="sr-only">{active.label}</caption>
              <thead className="bg-muted/70 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="w-10 bg-muted/70 px-1" scope="col">
                    <span className="sr-only">Row order</span>
                  </th>
                  <th className="w-10 bg-muted/70 px-2 py-2" scope="col">
                    <input
                      aria-label="Select all rows"
                      checked={
                        visibleRows.length > 0 &&
                        visibleRows.every((row) =>
                          selectedRows.includes(row.id),
                        )
                      }
                      className="size-4 accent-primary"
                      onChange={() =>
                        setSelectedRows(
                          visibleRows.every((row) =>
                            selectedRows.includes(row.id),
                          )
                            ? selectedRows.filter(
                                (id) =>
                                  !visibleRows.some((row) => row.id === id),
                              )
                            : [
                                ...new Set([
                                  ...selectedRows,
                                  ...visibleRows.map((row) => row.id),
                                ]),
                              ],
                        )
                      }
                      type="checkbox"
                    />
                  </th>
                  {active.columns.map((column, index) => (
                    <SortableColumn
                      active={active}
                      clipboard={clipboard}
                      column={column}
                      index={index}
                      key={column.id}
                      onSelectedChange={() =>
                        setSelectedColumns((current) =>
                          current.includes(column.id)
                            ? current.filter((id) => id !== column.id)
                            : [...current, column.id],
                        )
                      }
                      selected={selectedColumns.includes(column.id)}
                      suppressMenuClick={suppressMenuClick}
                      setClipboard={setClipboard}
                      updateActive={updateActive}
                    />
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleRows.length > 0 ? (
                  visibleRows.map((row, sortIndex) => (
                    <SortableRow
                      active={active}
                      clipboard={clipboard}
                      index={active.rows.findIndex(
                        (item) => item.id === row.id,
                      )}
                      key={row.id}
                      onDeleted={() =>
                        setSelectedRows((current) =>
                          current.filter((id) => id !== row.id),
                        )
                      }
                      onSelectedChange={() =>
                        setSelectedRows((current) =>
                          current.includes(row.id)
                            ? current.filter((id) => id !== row.id)
                            : [...current, row.id],
                        )
                      }
                      row={row}
                      selected={selectedRows.includes(row.id)}
                      sortIndex={sortIndex}
                      suppressMenuClick={suppressMenuClick}
                      setClipboard={setClipboard}
                      updateActive={updateActive}
                    />
                  ))
                ) : (
                  <tr>
                    <td
                      className="px-3 py-8 text-center text-sm text-muted-foreground"
                      colSpan={active.columns.length + 2}
                    >
                      No matching rows
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <DragOverlay>
            {(source) => {
              const sourceData = source.data as SortData | undefined;
              if (!sourceData) return null;
              const previewClassName =
                "overflow-hidden rounded-xl bg-card text-sm shadow-xl";

              if (sourceData.kind === "directory-row") {
                const rowIndex = active.rows.findIndex(
                  (row) => row.id === sourceData.id,
                );
                const row = active.rows[rowIndex];
                if (!row) return null;
                return (
                  <div
                    className={`${previewClassName} flex h-10 min-w-[42rem] items-stretch`}
                  >
                    <div className="flex w-10 shrink-0 items-center justify-center bg-muted/35 text-muted-foreground">
                      <HugeiconsIcon
                        aria-hidden
                        className="size-3.5"
                        icon={DragDropVerticalIcon}
                      />
                    </div>
                    <div className="flex w-10 shrink-0 items-center justify-center bg-muted/35">
                      <input
                        aria-hidden
                        checked={selectedRows.includes(row.id)}
                        className="size-4 accent-primary"
                        readOnly
                        tabIndex={-1}
                        type="checkbox"
                      />
                    </div>
                    {active.columns.map(({ id }) => (
                      <div
                        className="flex min-w-44 flex-1 items-center truncate border-l border-border/60 px-3"
                        key={id}
                      >
                        {row.cells[id] ?? ""}
                      </div>
                    ))}
                  </div>
                );
              }

              const columnIndex = active.columns.findIndex(
                ({ id }) => id === sourceData.id,
              );
              const column = active.columns[columnIndex];
              return (
                <div className={`${previewClassName} w-44`}>
                  <div className="flex h-10 items-center gap-1 bg-muted/70 px-2 py-2 text-xs font-medium text-muted-foreground">
                    <HugeiconsIcon
                      aria-hidden
                      className="size-3.5"
                      icon={DragDropHorizontalIcon}
                    />
                    {column?.name ?? "New column"}
                  </div>
                  {active.rows.slice(0, 6).map((row) => (
                    <div
                      className="h-10 truncate border-t border-border/60 px-3 py-2"
                      key={row.id}
                    >
                      {row.cells[sourceData.id] ?? ""}
                    </div>
                  ))}
                </div>
              );
            }}
          </DragOverlay>
        </DragDropProvider>
      </BlockShell>
    );
  },
});
