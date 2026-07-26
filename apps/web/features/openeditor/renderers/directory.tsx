"use client";

import { NamedItemSwitcher } from "@/features/openeditor/renderers/named-item-switcher";
import type { Directory, DirectoryContent } from "@baseblocks/domain";
import { Button } from "@baseblocks/ui/button";
import { Input } from "@baseblocks/ui/input";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { useEffect, useState } from "react";

export const directoryCellClassName =
  "whitespace-normal px-3 py-2 align-top [overflow-wrap:anywhere]";

export function useDirectoryView(directory: Directory) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const normalizedQuery = query.trim().toLowerCase();
  const filteredRows = normalizedQuery
    ? directory.rows.filter((row) =>
        directory.columnIds.some((columnId) =>
          (row.cells[columnId] ?? "").toLowerCase().includes(normalizedQuery),
        ),
      )
    : directory.rows;
  const pageCount = directory.pageSize
    ? Math.max(1, Math.ceil(filteredRows.length / directory.pageSize))
    : 1;
  const currentPage = Math.min(page, pageCount);
  const rows = directory.pageSize
    ? filteredRows.slice(
        (currentPage - 1) * directory.pageSize,
        currentPage * directory.pageSize,
      )
    : filteredRows;

  useEffect(() => setPage(currentPage), [currentPage]);

  return {
    currentPage,
    pageCount,
    query,
    rows,
    setPage,
    updateQuery: (value: string) => {
      setQuery(value);
      setPage(1);
    },
  };
}

export function DirectorySearch({
  onQueryChange,
  query,
}: {
  onQueryChange: (query: string) => void;
  query: string;
}) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        aria-label="Search directory"
        className="!rounded-2xl !border-0 !bg-card !pl-10 !shadow-none"
        onChange={(event) => onQueryChange(event.target.value)}
        placeholder="Search directory…"
        value={query}
      />
    </div>
  );
}

export function DirectoryPagination({
  currentPage,
  onPageChange,
  pageCount,
}: {
  currentPage: number;
  onPageChange: (page: number) => void;
  pageCount: number;
}) {
  if (pageCount <= 1) return null;

  return (
    <div className="flex min-h-8 items-center justify-end gap-1 text-xs text-muted-foreground">
      <Button
        aria-label="Previous page"
        disabled={currentPage === 1}
        onClick={() => onPageChange(currentPage - 1)}
        size="icon-xs"
        type="button"
        variant="ghost"
      >
        <ChevronLeft />
      </Button>
      <span className="min-w-20 text-center tabular-nums">
        Page {currentPage} of {pageCount}
      </span>
      <Button
        aria-label="Next page"
        disabled={currentPage === pageCount}
        onClick={() => onPageChange(currentPage + 1)}
        size="icon-xs"
        type="button"
        variant="ghost"
      >
        <ChevronRight />
      </Button>
    </div>
  );
}

export function DirectorySwitcher({
  activeDirectoryId,
  directories,
  onAdd,
  onDuplicate,
  onRemove,
  onRename,
  onSelect,
}: {
  activeDirectoryId: string;
  directories: Directory[];
  onAdd?: () => void;
  onDuplicate?: () => void;
  onRemove?: () => void;
  onRename?: (directoryId: string, label: string) => void;
  onSelect: (directoryId: string) => void;
}) {
  return (
    <NamedItemSwitcher
      activeId={activeDirectoryId}
      collectionLabel="Directories"
      itemName="directory"
      items={directories}
      onAdd={onAdd}
      onDuplicate={onDuplicate}
      onRemove={onRemove}
      onRename={onRename}
      onSelect={onSelect}
    />
  );
}

function DirectoryContents({ directory }: { directory: Directory }) {
  const view = useDirectoryView(directory);
  return (
    <>
      {directory.rows.length > 5 ? (
        <DirectorySearch onQueryChange={view.updateQuery} query={view.query} />
      ) : null}
      <div className="overflow-hidden rounded-2xl bg-card">
        <table className="w-full table-fixed text-sm">
          <tbody>
            {view.rows.length ? (
              view.rows.map((row) => (
                <tr className="border-b last:border-0" key={row.id}>
                  {directory.columnIds.map((columnId) => (
                    <td className={directoryCellClassName} key={columnId}>
                      {row.cells[columnId] ?? ""}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  className="py-10 text-center text-muted-foreground"
                  colSpan={directory.columnIds.length}
                >
                  {view.query ? "No rows found." : "No rows yet."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <DirectoryPagination
        currentPage={view.currentPage}
        onPageChange={view.setPage}
        pageCount={view.pageCount}
      />
    </>
  );
}

export function DirectoryViewer({ value }: { value: DirectoryContent }) {
  const [activeId, setActiveId] = useState(
    value.directories[0]?.id ?? "default",
  );
  const active =
    value.directories.find(({ id }) => id === activeId) ?? value.directories[0];
  if (!active) return null;

  return (
    <section className="not-prose my-4 space-y-3">
      {value.directories.length > 1 ? (
        <DirectorySwitcher
          activeDirectoryId={active.id}
          directories={value.directories}
          onSelect={setActiveId}
        />
      ) : null}
      <DirectoryContents key={active.id} directory={active} />
    </section>
  );
}
