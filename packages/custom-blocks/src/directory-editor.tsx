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
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@baseblocks/ui/button";
import { Input } from "@baseblocks/ui/input";
import { closestCenter } from "@dnd-kit/collision";
import { PointerActivationConstraints, PointerSensor } from "@dnd-kit/dom";
import { DragDropProvider } from "@dnd-kit/react";
import { isSortable, useSortable } from "@dnd-kit/react/sortable";
import { defineOpenEditorCustomBlockEditor } from "@openeditor/custom-block/editor";
import { type RefObject, useRef, useState } from "react";
import {
  addDirectory,
  deleteDirectory,
  deleteDirectoryRow,
  duplicateDirectory,
  duplicateDirectoryColumn,
  duplicateDirectoryRow,
  insertDirectoryColumn,
  insertDirectoryRow,
  moveDirectoryItem,
  pasteDirectoryColumn,
  pasteDirectoryRow,
  removeDirectoryColumn,
  renameDirectory,
  type Directory,
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

function DragHandle({
  actions,
  axis,
  handleRef,
  index,
  suppressMenuClick,
  total,
}: {
  actions: ActionItem[];
  axis: "column" | "row";
  handleRef: (element: Element | null) => void;
  index: number;
  suppressMenuClick: RefObject<boolean>;
  total: number;
}) {
  const label = `${axis === "column" ? "Move column" : "Move row"} ${index + 1}; position ${index + 1} of ${total}`;
  return (
    <ActionMenu
      items={actions}
      label={`${axis === "column" ? "Column" : "Row"} ${index + 1} actions`}
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
  columnId,
  index,
  suppressMenuClick,
  updateActive,
}: {
  active: Directory;
  columnId: string;
  index: number;
  suppressMenuClick: RefObject<boolean>;
  updateActive: (next: Directory) => void;
}) {
  const sortable = useSortable<SortData>({
    id: columnId,
    index,
    group: "directory-columns",
    data: { kind: "directory-column", id: columnId },
    collisionDetector: closestCenter,
    type: "directory-column",
    accept: "directory-column",
  });
  return (
    <th
      className={`min-w-44 border-l border-border/70 px-2 py-2 text-left first:border-l-0 ${sortable.isDropTarget ? "bg-muted" : ""} ${sortable.isDragging ? "opacity-40" : ""}`}
      ref={sortable.ref}
      scope="col"
    >
      <div className="flex items-center gap-1">
        <DragHandle
          actions={[
            {
              disabled: index === 0,
              icon: ArrowLeft01Icon,
              label: "Move left",
              onSelect: () => {
                const target = active.columnIds[index - 1];
                if (target)
                  updateActive({
                    ...active,
                    columnIds: moveDirectoryItem(
                      active.columnIds,
                      columnId,
                      target,
                    ),
                  });
              },
            },
            {
              disabled: index === active.columnIds.length - 1,
              icon: ArrowRight01Icon,
              label: "Move right",
              onSelect: () => {
                const target = active.columnIds[index + 1];
                if (target)
                  updateActive({
                    ...active,
                    columnIds: moveDirectoryItem(
                      active.columnIds,
                      columnId,
                      target,
                    ),
                  });
              },
            },
            {
              icon: ArrowLeft01Icon,
              label: "Insert before",
              onSelect: () =>
                updateActive(
                  insertDirectoryColumn(active, columnId, false, createId),
                ),
              separatorBefore: true,
            },
            {
              icon: ArrowRight01Icon,
              label: "Insert after",
              onSelect: () =>
                updateActive(
                  insertDirectoryColumn(active, columnId, true, createId),
                ),
            },
            {
              icon: Copy01Icon,
              label: "Duplicate column",
              onSelect: () =>
                updateActive(
                  duplicateDirectoryColumn(active, columnId, createId),
                ),
            },
            {
              icon: Copy01Icon,
              label: "Copy column",
              onSelect: () =>
                navigator.clipboard.writeText(
                  active.rows
                    .map((row) => row.cells[columnId] ?? "")
                    .join("\n"),
                ),
              separatorBefore: true,
            },
            {
              icon: FilePasteIcon,
              label: "Paste column",
              onSelect: async () =>
                updateActive(
                  pasteDirectoryColumn(
                    active,
                    columnId,
                    (await navigator.clipboard.readText()).split(/\r?\n/),
                    createId,
                  ),
                ),
            },
            {
              destructive: true,
              disabled: active.columnIds.length === 1,
              icon: Delete01Icon,
              label: "Delete column",
              onSelect: () =>
                updateActive(removeDirectoryColumn(active, columnId)),
              separatorBefore: true,
            },
          ]}
          axis="column"
          handleRef={sortable.handleRef}
          index={index}
          suppressMenuClick={suppressMenuClick}
          total={active.columnIds.length}
        />
        <span className="min-w-0 flex-1 text-xs font-medium text-muted-foreground">
          {`Column ${index + 1}`}
        </span>
      </div>
    </th>
  );
}

function SortableRow({
  active,
  index,
  onDeleted,
  onSelectedChange,
  row,
  selected,
  suppressMenuClick,
  updateActive,
}: {
  active: Directory;
  index: number;
  onDeleted: () => void;
  onSelectedChange: () => void;
  row: DirectoryRow;
  selected: boolean;
  suppressMenuClick: RefObject<boolean>;
  updateActive: (next: Directory) => void;
}) {
  const sortable = useSortable<SortData>({
    id: row.id,
    index,
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
              onSelect: () =>
                navigator.clipboard.writeText(
                  active.columnIds
                    .map((columnId) => row.cells[columnId] ?? "")
                    .join("\t"),
                ),
              separatorBefore: true,
            },
            {
              icon: FilePasteIcon,
              label: "Paste row",
              onSelect: async () =>
                updateActive(
                  pasteDirectoryRow(
                    active,
                    row.id,
                    (await navigator.clipboard.readText()).split("\t"),
                    createId,
                  ),
                ),
            },
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
      {active.columnIds.map((columnId, columnIndex) => (
        <td className="border-l p-0" key={columnId}>
          <Input
            aria-label={`Row ${index + 1}, column ${columnIndex + 1}`}
            className="h-10 rounded-none border-0 bg-transparent px-3 shadow-none focus-visible:bg-background focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/50"
            onChange={(event) =>
              updateActive({
                ...active,
                rows: active.rows.map((item) =>
                  item.id === row.id
                    ? {
                        ...item,
                        cells: {
                          ...item.cells,
                          [columnId]: event.target.value,
                        },
                      }
                    : item,
                ),
              })
            }
            value={row.cells[columnId] ?? ""}
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
    const [selectedRows, setSelectedRows] = useState<string[]>([]);
    const suppressMenuClick = useRef(false);
    const active =
      data.directories.find(({ id }) => id === activeId) ?? data.directories[0];
    if (!active) return null;
    const updateActive = (next: Directory) =>
      updateDataJson({
        directories: data.directories.map((item) =>
          item.id === active.id ? next : item,
        ),
      });

    return (
      <BlockShell label="Edit directory">
        <div className="flex flex-wrap items-center justify-between gap-2 px-1">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            {renaming ? (
              <Input
                aria-label="Directory name"
                autoFocus
                className="min-w-36 max-w-72 bg-background font-semibold"
                onBlur={() => setRenaming(false)}
                onChange={(event) =>
                  updateDataJson(
                    renameDirectory(data, active.id, event.target.value),
                  )
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === "Escape")
                    setRenaming(false);
                }}
                value={active.label}
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
                }}
                options={data.directories}
                valueLabel={active.label}
              />
            )}
          </div>
          {selectedRows.length > 0 ? (
            <div className="flex min-w-0 flex-wrap items-center justify-end gap-1">
              <span className="px-2 text-xs font-medium text-muted-foreground tabular-nums">
                {selectedRows.length} selected
              </span>
              <Button
                onClick={() => {
                  const next = selectedRows.reduce(
                    (directory, rowId) => deleteDirectoryRow(directory, rowId),
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
                Delete
              </Button>
            </div>
          ) : null}
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
              const target = active.columnIds[source.index];
              if (target)
                updateActive({
                  ...active,
                  columnIds: moveDirectoryItem(
                    active.columnIds,
                    data.id,
                    target,
                  ),
                });
              return;
            }
            const target = active.rows[source.index];
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
                        active.rows.length > 0 &&
                        selectedRows.length === active.rows.length
                      }
                      className="size-4 accent-primary"
                      onChange={() =>
                        setSelectedRows(
                          selectedRows.length === active.rows.length
                            ? []
                            : active.rows.map((row) => row.id),
                        )
                      }
                      type="checkbox"
                    />
                  </th>
                  {active.columnIds.map((columnId, index) => (
                    <SortableColumn
                      active={active}
                      columnId={columnId}
                      index={index}
                      key={columnId}
                      suppressMenuClick={suppressMenuClick}
                      updateActive={updateActive}
                    />
                  ))}
                </tr>
              </thead>
              <tbody>
                {active.rows.map((row, index) => (
                  <SortableRow
                    active={active}
                    index={index}
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
                    suppressMenuClick={suppressMenuClick}
                    updateActive={updateActive}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </DragDropProvider>
      </BlockShell>
    );
  },
});
