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
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@baseblocks/ui/button";
import { Input } from "@baseblocks/ui/input";
import { closestCenter } from "@dnd-kit/collision";
import { PointerActivationConstraints, PointerSensor } from "@dnd-kit/dom";
import { DragDropProvider, KeyboardSensor } from "@dnd-kit/react";
import { isSortable, useSortable } from "@dnd-kit/react/sortable";
import { defineOpenEditorCustomBlockEditor } from "@openeditor/custom-block/editor";
import { useState } from "react";
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
import { ActionMenu, BlockShell, selectClassName } from "./ui";

const createId = () => crypto.randomUUID();
const sensors = [
  PointerSensor.configure({
    activationConstraints: () => [
      new PointerActivationConstraints.Distance({ value: 5 }),
    ],
  }),
  KeyboardSensor,
];

type SortData =
  | { kind: "directory-column"; id: string }
  | { kind: "directory-row"; id: string };

function DragHandle({
  axis,
  handleRef,
  index,
  total,
}: {
  axis: "column" | "row";
  handleRef: (element: Element | null) => void;
  index: number;
  total: number;
}) {
  const label = `${axis === "column" ? "Move column" : "Move row"} ${index + 1}; position ${index + 1} of ${total}`;
  return (
    <Button
      aria-label={label}
      className="cursor-grab touch-none text-muted-foreground opacity-40 hover:opacity-100 active:cursor-grabbing"
      ref={handleRef}
      size="icon-xs"
      title={label}
      type="button"
      variant="ghost"
    >
      <HugeiconsIcon
        aria-hidden
        icon={axis === "column" ? DragDropHorizontalIcon : DragDropVerticalIcon}
      />
    </Button>
  );
}

function SortableColumn({
  active,
  columnId,
  index,
  updateActive,
}: {
  active: Directory;
  columnId: string;
  index: number;
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
      className={`min-w-44 border-l px-2 py-2 text-left first:border-l-0 ${sortable.isDropTarget ? "bg-muted" : ""} ${sortable.isDragging ? "opacity-40" : ""}`}
      ref={sortable.ref}
      scope="col"
    >
      <div className="flex items-center gap-1">
        <DragHandle
          axis="column"
          handleRef={sortable.handleRef}
          index={index}
          total={active.columnIds.length}
        />
        <span className="min-w-0 flex-1 text-xs font-medium text-muted-foreground">
          {`Column ${index + 1}`}
        </span>
        <ActionMenu
          items={[
            {
              icon: ArrowLeft01Icon,
              label: "Insert before",
              onSelect: () =>
                updateActive(
                  insertDirectoryColumn(active, columnId, false, createId),
                ),
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
          label={`Column ${index + 1} actions`}
        />
      </div>
    </th>
  );
}

function SortableRow({
  active,
  index,
  onSelectedChange,
  row,
  selected,
  updateActive,
}: {
  active: Directory;
  index: number;
  onSelectedChange: () => void;
  row: DirectoryRow;
  selected: boolean;
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
      className={`group border-t hover:bg-muted/30 ${selected ? "bg-primary/10" : ""} ${sortable.isDropTarget ? "bg-muted" : ""} ${sortable.isDragging ? "opacity-40" : ""}`}
      ref={sortable.ref}
    >
      <th className="w-10 px-1 text-center" scope="row">
        <DragHandle
          axis="row"
          handleRef={sortable.handleRef}
          index={index}
          total={active.rows.length}
        />
      </th>
      <td className="w-10 px-2 py-1 text-center">
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
      <td className="w-10 border-l px-1 text-center opacity-40 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
        <ActionMenu
          items={[
            {
              icon: ArrowUp01Icon,
              label: "Insert above",
              onSelect: () =>
                updateActive(
                  insertDirectoryRow(active, row.id, false, createId),
                ),
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
              onSelect: () => updateActive(deleteDirectoryRow(active, row.id)),
              separatorBefore: true,
            },
          ]}
          label={`Row ${index + 1} actions`}
        />
      </td>
    </tr>
  );
}

export const directoryEditor = defineOpenEditorCustomBlockEditor({
  block: directoryBlock,
  render: function DirectoryEditor({ data, updateData }) {
    const updateDataJson = (value: unknown) => updateData(value as typeof data);
    const [activeId, setActiveId] = useState(data.directories[0]?.id ?? "");
    const [selectedRows, setSelectedRows] = useState<string[]>([]);
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
      <BlockShell label="Edit directory" surface>
        <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-2">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            {data.directories.length > 1 ? (
              <select
                aria-label="Directory"
                className={`${selectClassName} max-w-48`}
                onChange={(event) => setActiveId(event.target.value)}
                value={active.id}
              >
                {data.directories.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            ) : null}
            <Input
              aria-label="Directory name"
              className="min-w-36 max-w-64 rounded-lg border-transparent bg-transparent font-semibold shadow-none hover:bg-muted/50 focus-visible:bg-background"
              onChange={(event) =>
                updateDataJson(
                  renameDirectory(data, active.id, event.target.value),
                )
              }
              value={active.label}
            />
          </div>
          <div className="flex items-center gap-1">
            <Input
              aria-label="Rows per page"
              className="w-24 rounded-lg border-transparent bg-muted/50 shadow-none"
              min={1}
              onChange={(event) =>
                updateActive({
                  ...active,
                  pageSize: event.target.value
                    ? Number(event.target.value)
                    : null,
                })
              }
              placeholder="All rows"
              type="number"
              value={active.pageSize ?? ""}
            />
            <Button
              onClick={() => {
                const last = active.rows.at(-1);
                if (last)
                  updateActive(
                    insertDirectoryRow(active, last.id, true, createId),
                  );
              }}
              size="sm"
              type="button"
            >
              <HugeiconsIcon aria-hidden icon={Add01Icon} />
              Add row
            </Button>
            <ActionMenu
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
                  icon: Copy01Icon,
                  label: "Duplicate directory",
                  onSelect: () => {
                    const next = duplicateDirectory(data, active.id, createId);
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
              label="Directory actions"
            />
          </div>
        </div>

        <DragDropProvider
          sensors={sensors}
          onDragEnd={(event) => {
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
          <div className="min-h-[30rem] overflow-x-auto border-y bg-background">
            <table className="w-full min-w-[62rem] border-collapse text-sm">
              <caption className="sr-only">{active.label}</caption>
              <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="w-10 px-1" scope="col">
                    <span className="sr-only">Row order</span>
                  </th>
                  <th className="w-10 px-2 py-2" scope="col">
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
                      updateActive={updateActive}
                    />
                  ))}
                  <th className="w-10 border-l" scope="col">
                    <span className="sr-only">Row actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {active.rows.map((row, index) => (
                  <SortableRow
                    active={active}
                    index={index}
                    key={row.id}
                    onSelectedChange={() =>
                      setSelectedRows((current) =>
                        current.includes(row.id)
                          ? current.filter((id) => id !== row.id)
                          : [...current, row.id],
                      )
                    }
                    row={row}
                    selected={selectedRows.includes(row.id)}
                    updateActive={updateActive}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </DragDropProvider>
        <Button
          className="ml-1 w-fit text-muted-foreground"
          onClick={() => {
            const last = active.rows.at(-1);
            if (last)
              updateActive(insertDirectoryRow(active, last.id, true, createId));
          }}
          size="sm"
          type="button"
          variant="ghost"
        >
          <HugeiconsIcon aria-hidden icon={Add01Icon} />
          New record
        </Button>
      </BlockShell>
    );
  },
});
