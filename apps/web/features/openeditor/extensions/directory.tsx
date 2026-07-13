"use client";

import { baseBlocksSlashMenuOrder } from "@/features/openeditor/slash-menu";
import {
  DirectoryViewer,
  readDirectory,
} from "@/features/openeditor/renderers/directory";
import type {
  DirectoryColumn,
  DirectoryContent,
  DirectoryRow,
} from "@baseblocks/domain";
import { Button } from "@baseblocks/ui/button";
import { Input } from "@baseblocks/ui/input";
import { Label } from "@baseblocks/ui/label";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@baseblocks/ui/pagination";
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
import { Switch } from "@baseblocks/ui/switch";
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
import { Plus, Search, Settings, TableProperties, Trash2 } from "lucide-react";
import { useState } from "react";

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50] as const;

const emptyDirectory = (): DirectoryContent => ({
  columns: [],
  rows: [],
  settings: { copyMode: "none", pageSize: 10, showSearch: true },
});

const makeId = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;

function blankRow(columns: DirectoryColumn[]): DirectoryRow {
  return {
    id: makeId("row"),
    cells: Object.fromEntries(columns.map((column) => [column.id, ""])),
  };
}

function paginationItems(
  currentPage: number,
  pageCount: number,
): Array<number | { ellipsisBefore: number }> {
  if (pageCount <= 7) {
    return Array.from({ length: pageCount }, (_, index) => index + 1);
  }

  const pages = new Set([
    1,
    pageCount,
    currentPage - 1,
    currentPage,
    currentPage + 1,
  ]);
  const visiblePages = [...pages]
    .filter((page) => page >= 1 && page <= pageCount)
    .sort((a, b) => a - b);

  return visiblePages.flatMap<number | { ellipsisBefore: number }>(
    (page, index) => {
      const previous = visiblePages[index - 1];
      return previous && page - previous > 1
        ? [{ ellipsisBefore: page }, page]
        : [page];
    },
  );
}

function DirectoryTable({
  value,
  onChange,
}: {
  value: DirectoryContent;
  onChange: (value: DirectoryContent) => void;
}) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const normalized = readDirectory(value);
  const rows = (() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return normalized.rows;
    return normalized.rows.filter((row) =>
      normalized.columns.some((column) =>
        (row.cells[column.id] ?? "").toLowerCase().includes(needle),
      ),
    );
  })();
  const pageSize = normalized.settings.pageSize;
  const pageCount =
    pageSize > 0 ? Math.max(1, Math.ceil(rows.length / pageSize)) : 1;
  const currentPage = Math.min(page, pageCount);
  const visibleRows =
    pageSize > 0
      ? rows.slice((currentPage - 1) * pageSize, currentPage * pageSize)
      : rows;
  const update = (next: DirectoryContent) => onChange(next);

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
  const addRow = () => {
    const next = {
      ...normalized,
      rows: [...normalized.rows, blankRow(normalized.columns)],
    };
    update(next);
    if (pageSize > 0) setPage(Math.ceil(next.rows.length / pageSize));
  };
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
  const updatePageSize = (nextPageSize: number) => {
    setPage(1);
    update({
      ...normalized,
      settings: { ...normalized.settings, pageSize: nextPageSize },
    });
  };
  const updateShowSearch = (showSearch: boolean) => {
    if (!showSearch) setQuery("");
    update({
      ...normalized,
      settings: { ...normalized.settings, showSearch },
    });
  };
  const goToPage = (nextPage: number) => {
    setPage(Math.min(pageCount, Math.max(1, nextPage)));
  };

  return (
    <section className="not-prose my-4 flex items-start gap-2">
      <div className="min-w-0 flex-1 space-y-3">
        {normalized.settings.showSearch && normalized.columns.length > 0 ? (
          <div className="relative block rounded-2xl transition-all hover:ring-0">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <span className="sr-only">Search directory</span>
            <Input
              className="!rounded-2xl !border-0 !bg-card !pl-10 !shadow-none"
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              placeholder="Search directory…"
              value={query}
            />
          </div>
        ) : null}
        {normalized.columns.length === 0 ? (
          <div className="flex min-h-28 items-center justify-center rounded-2xl border border-dashed">
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
                    </TableHead>
                  ))}
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell
                      className="py-10 text-center text-muted-foreground"
                      colSpan={normalized.columns.length + 1}
                    >
                      {query ? "No rows found." : "No rows yet."}
                    </TableCell>
                  </TableRow>
                ) : (
                  visibleRows.map((row) => (
                    <TableRow key={row.id}>
                      {normalized.columns.map((column) => (
                        <TableCell className="min-w-44 p-1.5" key={column.id}>
                          <Input
                            aria-label={`${column.header} value`}
                            className="h-8 border-transparent bg-transparent shadow-none focus-visible:bg-background"
                            onChange={(event) =>
                              updateCell(row.id, column.id, event.target.value)
                            }
                            value={row.cells[column.id] ?? ""}
                          />
                        </TableCell>
                      ))}
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
                    </TableRow>
                  ))
                )}
              </TableBody>
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
            </Table>
          </div>
        )}
        {pageCount > 1 ? (
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  aria-disabled={currentPage === 1}
                  className={
                    currentPage === 1
                      ? "pointer-events-none opacity-50"
                      : undefined
                  }
                  href="#"
                  onClick={(event) => {
                    event.preventDefault();
                    goToPage(currentPage - 1);
                  }}
                  tabIndex={currentPage === 1 ? -1 : undefined}
                />
              </PaginationItem>
              {paginationItems(currentPage, pageCount).map((item) =>
                typeof item === "object" ? (
                  <PaginationItem
                    key={`ellipsis-before-${item.ellipsisBefore}`}
                  >
                    <PaginationEllipsis />
                  </PaginationItem>
                ) : (
                  <PaginationItem key={item}>
                    <PaginationLink
                      href="#"
                      isActive={item === currentPage}
                      onClick={(event) => {
                        event.preventDefault();
                        goToPage(item);
                      }}
                    >
                      {item}
                    </PaginationLink>
                  </PaginationItem>
                ),
              )}
              <PaginationItem>
                <PaginationNext
                  aria-disabled={currentPage === pageCount}
                  className={
                    currentPage === pageCount
                      ? "pointer-events-none opacity-50"
                      : undefined
                  }
                  href="#"
                  onClick={(event) => {
                    event.preventDefault();
                    goToPage(currentPage + 1);
                  }}
                  tabIndex={currentPage === pageCount ? -1 : undefined}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        ) : null}
      </div>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            aria-label="Configure directory"
            className="shrink-0 rounded-2xl border-0 bg-card shadow-none hover:bg-muted/60"
            size="icon"
            type="button"
            variant="ghost"
          >
            <Settings className="size-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          className="w-72 rounded-[1.25rem] border-sidebar-border bg-sidebar p-4 text-sidebar-foreground shadow-2xl"
        >
          <PopoverHeader className="mb-4">
            <PopoverTitle>Directory settings</PopoverTitle>
          </PopoverHeader>
          <div className="grid gap-4">
            <div className="grid gap-1.5">
              <Label className="text-xs font-medium tracking-wide text-sidebar-foreground/55">
                Rows per page
              </Label>
              <Select
                onValueChange={(next) => updatePageSize(Number(next))}
                value={String(pageSize)}
              >
                <SelectTrigger className="h-10 w-full rounded-[0.95rem] border-sidebar-border/80 bg-background/70 text-sidebar-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-[1rem] border-sidebar-border bg-sidebar text-sidebar-foreground shadow-2xl">
                  {PAGE_SIZE_OPTIONS.map((option) => (
                    <SelectItem key={option} value={String(option)}>
                      {option}
                    </SelectItem>
                  ))}
                  <SelectItem value="0">Unlimited</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between gap-4">
              <Label className="text-sm" htmlFor="directory-show-search">
                Show search
              </Label>
              <Switch
                checked={normalized.settings.showSearch}
                id="directory-show-search"
                onCheckedChange={updateShowSearch}
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>
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
      {editor.isEditable ? (
        <DirectoryTable
          onChange={(directory) => updateAttributes({ directory })}
          value={readDirectory(node.attrs.directory)}
        />
      ) : (
        <DirectoryViewer value={readDirectory(node.attrs.directory)} />
      )}
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
  insertMenu: {
    icon: TableProperties,
    keywords: ["table", "data", "list", "grid"],
    order: baseBlocksSlashMenuOrder.directory,
  },
  viewer: ({ node }) => (
    <DirectoryViewer value={readDirectory(node.attrs?.directory)} />
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
