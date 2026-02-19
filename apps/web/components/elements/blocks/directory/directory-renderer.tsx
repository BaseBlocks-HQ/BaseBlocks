"use client";

import type { ElementRendererProps } from "@/components/elements/registry";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { DirectoryColumnType } from "@/types/elements";
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
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";

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
          className="inline-flex items-center gap-1.5 text-primary hover:underline underline-offset-2"
        >
          <Mail className="h-3.5 w-3.5 shrink-0 opacity-60" />
          {value}
        </a>
      );
    case "phone":
      return (
        <a
          href={getPhoneHref(value)}
          className="inline-flex items-center gap-1.5 text-primary hover:underline underline-offset-2"
        >
          <Phone className="h-3.5 w-3.5 shrink-0 opacity-60" />
          {formatPhoneNumber(value)}
        </a>
      );
    case "url":
      return (
        <a
          href={normalizeUrl(value)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-primary hover:underline underline-offset-2"
        >
          {value.replace(/^https?:\/\/(www\.)?/i, "")}
          <ExternalLink className="h-3 w-3 shrink-0 opacity-60" />
        </a>
      );
    default:
      return <>{value}</>;
  }
}

export function DirectoryRenderer({
  content,
}: ElementRendererProps<"directory">) {
  const { columns, rows, settings } = content;
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredRows = useMemo(() => {
    if (!searchQuery.trim()) return rows;
    const query = searchQuery.toLowerCase();
    return rows.filter((row) =>
      columns.some((col) =>
        (row.cells[col.id] ?? "").toLowerCase().includes(query),
      ),
    );
  }, [rows, columns, searchQuery]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredRows.length / settings.pageSize),
  );
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * settings.pageSize;
  const paginatedRows = filteredRows.slice(
    startIndex,
    startIndex + settings.pageSize,
  );

  // Reset to page 1 when search changes
  const handleSearch = useCallback((value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  }, []);

  const copyToClipboard = useCallback(async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  }, []);

  const copyRow = useCallback(
    (rowId: string) => {
      const row = rows.find((r) => r.id === rowId);
      if (!row) return;
      const text = columns.map((col) => row.cells[col.id] ?? "").join("\t");
      copyToClipboard(text, `row-${rowId}`);
    },
    [rows, columns, copyToClipboard],
  );

  if (columns.length === 0) return null;

  const showCopyColumn = settings.copyMode === "row";

  return (
    <div className="space-y-3">
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
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead key={col.id}>{col.header}</TableHead>
              ))}
              {showCopyColumn && <TableHead className="w-10" />}
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
                          settings.copyMode === "cell" && "group relative",
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
                    <TableCell className="w-10">
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
      {filteredRows.length > settings.pageSize && (
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
