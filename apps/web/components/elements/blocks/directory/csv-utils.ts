import type {
  DirectoryColumn,
  DirectoryContent,
  DirectorySettings,
} from "@/types/elements";

/**
 * Parse a CSV string into headers and rows.
 * Handles quoted fields (values containing commas, newlines, or escaped quotes).
 */
export function parseCSV(text: string): {
  headers: string[];
  rows: string[][];
} {
  const results: string[][] = [];
  let current = "";
  let inQuotes = false;
  let row: string[] = [];

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        // Escaped quote
        current += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        row.push(current.trim());
        current = "";
      } else if (char === "\n" || (char === "\r" && next === "\n")) {
        row.push(current.trim());
        if (row.length > 1 || row[0] !== "") {
          results.push(row);
        }
        row = [];
        current = "";
        if (char === "\r") i++; // skip \n in \r\n
      } else {
        current += char;
      }
    }
  }

  // Handle last field
  row.push(current.trim());
  if (row.length > 1 || row[0] !== "") {
    results.push(row);
  }

  const [headers = [], ...rows] = results;
  return { headers, rows };
}

/**
 * Convert parsed CSV data into DirectoryContent, preserving existing settings.
 */
export function csvToDirectoryContent(
  headers: string[],
  rows: string[][],
  settings: DirectorySettings,
): DirectoryContent {
  const now = Date.now();

  const columns: DirectoryColumn[] = headers.map((header, i) => ({
    id: `col-${now + i}`,
    header,
    type: "text" as const,
  }));

  const directoryRows = rows.map((cells, rowIdx) => ({
    id: `row-${now + rowIdx}`,
    cells: Object.fromEntries(
      columns.map((col, colIdx) => [col.id, cells[colIdx] ?? ""]),
    ),
  }));

  return { columns, rows: directoryRows, settings };
}
