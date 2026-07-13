export type DirectoryColumnType = "text" | "email" | "phone" | "url";

export interface DirectoryColumn {
  id: string;
  header: string;
  type?: DirectoryColumnType;
}

export interface DirectoryRow {
  id: string;
  cells: Record<string, string>;
}

export interface DirectorySettings {
  copyMode: "none" | "cell" | "row";
  pageSize: number;
  showSearch: boolean;
}

export interface DirectoryContent {
  columns: DirectoryColumn[];
  rows: DirectoryRow[];
  settings: DirectorySettings;
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
