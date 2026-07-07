"use client";

import { cn } from "@/lib/utils";
import type { ElementRendererProps } from "@/modules/editor/elements/framework/registry";
import type { DirectoryColumnType } from "@baseblocks/domain/elements";
import { Button } from "@baseblocks/ui/button";
import { Input } from "@baseblocks/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@baseblocks/ui/table";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardCopy,
  ExternalLink,
  Mail,
  Phone,
  Search,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

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

function formatPhoneNumber(raw: string): string {
  // Preserve user-entered formatting to avoid country-specific assumptions.
  return raw.trim();
}

function getPhoneHref(raw: string): string {
  const trimmed = raw.trim();
  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return `tel:${trimmed}`;

  const hasLeadingPlus = trimmed.startsWith("+");
  const normalized = hasLeadingPlus ? `+${digits}` : digits;
  return `tel:${normalized}`;
}

function normalizeUrl(raw: string): string {
  const trimmed = raw.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function CellContent({
  value,
  columnType,
}: {
  value: string;
  columnType?: DirectoryColumnType;
}) {
  if (!value) return null;

  switch (columnType) {
    case "email":
      return (
        <a
          href={`mailto:${value}`}
          className="inline-flex max-w-full items-start gap-1.5 text-primary hover:underline underline-offset-2"
        >
          <Mail className="h-3.5 w-3.5 shrink-0 opacity-60" />
          <span className="min-w-0 max-w-[9rem] break-words whitespace-normal leading-snug">
            {value}
          </span>
        </a>
      );
    case "phone":
      return (
        <a
          href={getPhoneHref(value)}
          className="inline-flex max-w-full items-start gap-1.5 text-primary hover:underline underline-offset-2"
        >
          <Phone className="h-3.5 w-3.5 shrink-0 opacity-60" />
          <span className="min-w-0 max-w-[9rem] break-words whitespace-normal leading-snug">
            {formatPhoneNumber(value)}
          </span>
        </a>
      );
    case "url":
      return (
        <a
          href={normalizeUrl(value)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex max-w-full items-start gap-1.5 text-primary hover:underline underline-offset-2"
        >
          <span className="min-w-0 max-w-[9rem] break-all whitespace-normal leading-snug">
            {value.replace(/^https?:\/\/(www\.)?/i, "")}
          </span>
          <ExternalLink className="h-3 w-3 shrink-0 opacity-60" />
        </a>
      );
    default:
      return (
        <span className="block max-w-[9rem] break-words whitespace-normal leading-snug">
          {value}
        </span>
      );
  }
}

export function DirectoryRenderer({
  content,
}: ElementRendererProps<"directory">) {
  const { columns, rows, settings } = content;
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredRows = (() => {
    if (!searchQuery.trim()) return rows;
    const query = searchQuery.toLowerCase();
    return rows.filter((row) =>
      columns.some((col) =>
        (row.cells[col.id] ?? "").toLowerCase().includes(query),
      ),
    );
  })();

  const {
    pageSize,
    totalPages,
    safeCurrentPage,
    paginatedItems: paginatedRows,
  } = getPaginatedItems(filteredRows, settings.pageSize, currentPage);

  // Reset to page 1 when search changes
  const handleSearch = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  };

  const copyRow = (rowId: string) => {
    const row = rows.find((r) => r.id === rowId);
    if (!row) return;
    const text = columns.map((col) => row.cells[col.id] ?? "").join("\t");
    copyToClipboard(text, `row-${rowId}`);
  };

  if (columns.length === 0) return null;

  const showCopyColumn = settings.copyMode === "row";

  return (
    <div className="not-prose space-y-3">
      {/* Search */}
      {settings.showSearch && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search directory..."
            className="pl-9"
          />
        </div>
      )}

      {/* Table */}
      <div className="rounded-lg border overflow-hidden">
        <Table className="w-full table-auto">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {columns.map((col) => (
                <TableHead
                  key={col.id}
                  className="h-auto py-3 align-middle whitespace-normal border-r last:border-r-0"
                >
                  <span className="block max-w-[9rem] break-words whitespace-normal leading-normal">
                    {col.header}
                  </span>
                </TableHead>
              ))}
              {showCopyColumn && (
                <TableHead className="h-auto w-10 py-3 align-middle border-r-0" />
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedRows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length + (showCopyColumn ? 1 : 0)}
                  className="text-center text-muted-foreground py-6"
                >
                  {searchQuery ? "No results found." : "No data yet."}
                </TableCell>
              </TableRow>
            ) : (
              paginatedRows.map((row) => (
                <TableRow key={row.id}>
                  {columns.map((col) => {
                    const cellValue = row.cells[col.id] ?? "";
                    const cellId = `${row.id}-${col.id}`;
                    return (
                      <TableCell
                        key={col.id}
                        className={cn(
                          "align-top whitespace-normal border-r last:border-r-0",
                          settings.copyMode === "cell" && "group relative pr-8",
                        )}
                      >
                        <CellContent value={cellValue} columnType={col.type} />
                        {settings.copyMode === "cell" && cellValue && (
                          <button
                            type="button"
                            onClick={() => copyToClipboard(cellValue, cellId)}
                            className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-muted"
                          >
                            {copiedId === cellId ? (
                              <Check className="h-3 w-3 text-green-600" />
                            ) : (
                              <ClipboardCopy className="h-3 w-3 text-muted-foreground" />
                            )}
                          </button>
                        )}
                      </TableCell>
                    );
                  })}
                  {showCopyColumn && (
                    <TableCell className="w-10 align-middle border-r-0">
                      <button
                        type="button"
                        onClick={() => copyRow(row.id)}
                        className="p-1 rounded hover:bg-muted transition-colors"
                      >
                        {copiedId === `row-${row.id}` ? (
                          <Check className="h-3.5 w-3.5 text-green-600" />
                        ) : (
                          <ClipboardCopy className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                      </button>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {settings.pageSize > 0 && filteredRows.length > pageSize && (
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
