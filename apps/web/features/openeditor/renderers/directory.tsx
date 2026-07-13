"use client";

import type { DirectoryContent } from "@baseblocks/domain";
import { Button } from "@baseblocks/ui/button";
import { Input } from "@baseblocks/ui/input";
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

export function DirectoryViewer({ value }: { value: DirectoryContent }) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const rows = normalizedQuery
    ? value.rows.filter((row) =>
        value.columns.some((column) =>
          (row.cells[column.id] ?? "")
            .toLocaleLowerCase()
            .includes(normalizedQuery),
        ),
      )
    : value.rows;
  const pageSize = value.settings.pageSize;
  const pageCount = pageSize
    ? Math.max(1, Math.ceil(rows.length / pageSize))
    : 1;
  const currentPage = Math.min(page, pageCount);
  const visibleRows = pageSize
    ? rows.slice((currentPage - 1) * pageSize, currentPage * pageSize)
    : rows;

  return (
    <section className="not-prose my-4 space-y-3">
      {value.settings.showSearch ? (
        <div className="relative max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Search directory"
            className="rounded-xl bg-card pl-9 shadow-none"
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
            placeholder="Search directory…"
            value={query}
          />
        </div>
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
              {visibleRows.length ? (
                visibleRows.map((row) => (
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
                    {query ? "No rows found." : "No rows yet."}
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
      {pageCount > 1 ? (
        <div className="flex items-center justify-center gap-2">
          <Button
            disabled={currentPage === 1}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            size="sm"
            type="button"
            variant="outline"
          >
            Previous
          </Button>
          <span className="text-xs tabular-nums text-muted-foreground">
            {currentPage} / {pageCount}
          </span>
          <Button
            disabled={currentPage === pageCount}
            onClick={() =>
              setPage((current) => Math.min(pageCount, current + 1))
            }
            size="sm"
            type="button"
            variant="outline"
          >
            Next
          </Button>
        </div>
      ) : null}
    </section>
  );
}
