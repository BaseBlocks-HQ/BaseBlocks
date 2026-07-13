"use client";

import type { DirectoryContent } from "@baseblocks/domain";
import { Input } from "@baseblocks/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@baseblocks/ui/pagination";
import { Search } from "lucide-react";
import { useState } from "react";

export function readDirectory(value: unknown): DirectoryContent {
  if (!value || typeof value !== "object") {
    return {
      columns: [],
      rows: [],
      settings: { copyMode: "none", pageSize: 10, showSearch: true },
    };
  }
  const candidate = value as Partial<DirectoryContent>;
  return {
    columns: Array.isArray(candidate.columns) ? candidate.columns : [],
    rows: Array.isArray(candidate.rows) ? candidate.rows : [],
    settings: {
      copyMode: candidate.settings?.copyMode ?? "none",
      pageSize: Math.max(0, candidate.settings?.pageSize ?? 10),
      showSearch: candidate.settings?.showSearch ?? true,
    },
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

export function useDirectoryView(value: DirectoryContent) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const normalizedQuery = query.trim().toLowerCase();
  const filteredRows = normalizedQuery
    ? value.rows.filter((row) =>
        value.columns.some((column) =>
          (row.cells[column.id] ?? "").toLowerCase().includes(normalizedQuery),
        ),
      )
    : value.rows;
  const pageSize = value.settings.pageSize;
  const pageCount = pageSize
    ? Math.max(1, Math.ceil(filteredRows.length / pageSize))
    : 1;
  const currentPage = Math.min(page, pageCount);
  const visibleRows = pageSize
    ? filteredRows.slice((currentPage - 1) * pageSize, currentPage * pageSize)
    : filteredRows;

  const updateQuery = (nextQuery: string) => {
    setQuery(nextQuery);
    setPage(1);
  };
  const goToPage = (nextPage: number) => {
    setPage(Math.max(1, nextPage));
  };

  return {
    currentPage,
    filteredRows,
    goToPage,
    pageCount,
    pageSize,
    query,
    updateQuery,
    visibleRows,
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
    <div className="relative block rounded-2xl transition-all hover:ring-0">
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
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            aria-disabled={currentPage === 1}
            className={
              currentPage === 1 ? "pointer-events-none opacity-50" : undefined
            }
            href="#"
            onClick={(event) => {
              event.preventDefault();
              onPageChange(currentPage - 1);
            }}
            tabIndex={currentPage === 1 ? -1 : undefined}
          />
        </PaginationItem>
        {paginationItems(currentPage, pageCount).map((item) =>
          typeof item === "object" ? (
            <PaginationItem key={`ellipsis-before-${item.ellipsisBefore}`}>
              <PaginationEllipsis />
            </PaginationItem>
          ) : (
            <PaginationItem key={item}>
              <PaginationLink
                href="#"
                isActive={item === currentPage}
                onClick={(event) => {
                  event.preventDefault();
                  onPageChange(item);
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
              onPageChange(currentPage + 1);
            }}
            tabIndex={currentPage === pageCount ? -1 : undefined}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}

export function DirectoryViewer({ value }: { value: DirectoryContent }) {
  const directory = useDirectoryView(value);

  return (
    <section className="not-prose my-4 space-y-3">
      {value.settings.showSearch && value.columns.length > 0 ? (
        <DirectorySearch
          onQueryChange={directory.updateQuery}
          query={directory.query}
        />
      ) : null}
      <div className="overflow-x-auto rounded-2xl bg-card">
        {value.columns.length ? (
          <table className="w-full caption-bottom text-sm">
            <thead className="border-b">
              <tr>
                {value.columns.map((column) => (
                  <th
                    className="whitespace-normal px-3 py-2 text-left align-top font-medium [overflow-wrap:anywhere]"
                    key={column.id}
                  >
                    {column.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {directory.visibleRows.length ? (
                directory.visibleRows.map((row) => (
                  <tr className="border-b last:border-0" key={row.id}>
                    {value.columns.map((column) => (
                      <td
                        className="whitespace-normal px-3 py-2 align-top [overflow-wrap:anywhere]"
                        key={column.id}
                      >
                        {row.cells[column.id] ?? ""}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    className="py-10 text-center text-muted-foreground"
                    colSpan={value.columns.length}
                  >
                    {directory.query ? "No rows found." : "No rows yet."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        ) : (
          <p className="py-10 text-center text-sm text-muted-foreground">
            No columns configured.
          </p>
        )}
      </div>
      <DirectoryPagination
        currentPage={directory.currentPage}
        onPageChange={directory.goToPage}
        pageCount={directory.pageCount}
      />
    </section>
  );
}
