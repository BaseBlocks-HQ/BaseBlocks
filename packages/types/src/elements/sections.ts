export type SectionType =
  | "search" // Search functionality
  | "library" // Document library
  | "quicklinks"; // Quick links grid

export interface SearchContent {
  placeholder?: string;
  maxResults?: number;
  showFileType?: boolean;
}

export interface LibraryContent {
  libraryId?: string;
  showFolderTree?: boolean;
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

export interface QuicklinksContent {
  links: QuicklinkItem[];
}

export type SectionContentUnion =
  | SearchContent
  | LibraryContent
  | QuicklinksContent;

export const DEFAULT_SECTION_CONTENT: Record<SectionType, SectionContentUnion> =
  {
    search: {
      placeholder: "Search...",
      maxResults: 10,
      showFileType: true,
    },
    library: {
      showFolderTree: true,
      allowDownloads: true,
    },
    quicklinks: { links: [] },
  };
