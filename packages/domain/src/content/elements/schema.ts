export interface DirectoryRow {
  id: string;
  cells: Record<string, string>;
}

export interface DirectoryColumn {
  id: string;
  name: string;
}

export interface Directory {
  id: string;
  label: string;
  columns: DirectoryColumn[];
  rows: DirectoryRow[];
  pageSize: number | null;
}

export interface DirectoryContent {
  directories: Directory[];
  /**
   * Block width on the page. "default" keeps the document text column;
   * "full" lets the block break out to the surrounding layout's full width.
   */
  width?: "default" | "full";
}

export interface SearchContent {
  placeholder?: string;
  maxResults?: number;
  showFileType?: boolean;
}

export interface LibraryContent {
  libraryId?: string;
  allowDownloads?: boolean;
}

export interface QuicklinkItem {
  id: string;
  title: string;
  url: string;
  imageUrl?: string;
}

export type SaveStatus = "idle" | "pending" | "saving" | "saved" | "error";
