import type {
  DirectoryColumn,
  DirectoryContent,
  DirectorySettings,
} from "@repo/types/elements";

function countDelimiterOutsideQuotes(line: string, delimiter: string): number {
  let inQuotes = false;
  let count = 0;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && char === delimiter) {
      count++;
    }
  }

  return count;
}

function detectDelimiter(text: string): "," | ";" | "\t" {
  const candidates = [",", ";", "\t"] as const;
  const sampleLines = text
    .split(/\r\n|\n|\r/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 5);

  if (sampleLines.length === 0) return ",";

  let bestDelimiter: "," | ";" | "\t" = ",";
  let bestScore = -1;

  for (const candidate of candidates) {
    const delimiterCounts = sampleLines.map((line) =>
      countDelimiterOutsideQuotes(line, candidate),
    );
    const totalCount = delimiterCounts.reduce((sum, count) => sum + count, 0);
    const linesWithDelimiter = delimiterCounts.filter(
      (count) => count > 0,
    ).length;
    const score = totalCount + linesWithDelimiter * 0.5;

    if (score > bestScore) {
      bestScore = score;
      bestDelimiter = candidate;
    }
  }

  return bestScore > 0 ? bestDelimiter : ",";
}

/**
 * Parse a CSV string into headers and rows.
 * Auto-detects delimiter (comma/semicolon/tab) and handles quoted fields.
 */
export function parseCSV(text: string): {
  headers: string[];
  rows: string[][];
} {
  const normalizedText = text.replace(/^\uFEFF/, "");
  const delimiter = detectDelimiter(normalizedText);
  const results: string[][] = [];
  let current = "";
  let inQuotes = false;
  let row: string[] = [];

  for (let i = 0; i < normalizedText.length; i++) {
    const char = normalizedText[i];
    const next = normalizedText[i + 1];

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
      } else if (char === delimiter) {
        row.push(current.trim());
        current = "";
      } else if (char === "\n" || char === "\r") {
        row.push(current.trim());
        if (row.length > 1 || row[0] !== "") {
          results.push(row);
        }
        row = [];
        current = "";
        if (char === "\r" && next === "\n") i++; // skip \n in \r\n
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
