export interface DirectoryRow {
  id: string;
  cells: Record<string, string>;
}

export interface Directory {
  id: string;
  label: string;
  columnIds: string[];
  rows: DirectoryRow[];
  pageSize: number | null;
}

export interface DirectoryContent {
  directories: Directory[];
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

export type QuicklinkType = "website" | "app";

export interface QuicklinkItem {
  id: string;
  title: string;
  url: string;
  imageUrl?: string;
  linkType?: QuicklinkType;
}

export type SaveStatus = "idle" | "pending" | "saving" | "saved" | "error";
