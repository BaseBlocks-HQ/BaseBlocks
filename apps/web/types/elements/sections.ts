/**
 * Section element types and content definitions
 * Sections are complex pre-built page sections (search, library, etc.)
 */

// Section element types
export type SectionType =
  | "search" // Search functionality
  | "library" // Document library
  | "quicklinks"; // Quick links grid

// Section content interfaces

export interface SearchContent {
  placeholder?: string;
  maxResults?: number;
  showFileType?: boolean;
}

export interface LibraryContent {
  libraryId?: string;
  displayStyle?: "list" | "grid";
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

// Union of all section content types
export type SectionContentUnion =
  | SearchContent
  | LibraryContent
  | QuicklinksContent;

// Default content for new sections
export const DEFAULT_SECTION_CONTENT: Record<SectionType, SectionContentUnion> =
  {
    search: {
      placeholder: "Search...",
      maxResults: 10,
      showFileType: true,
    },
    library: {
      displayStyle: "list",
      showFolderTree: true,
      allowDownloads: true,
    },
    quicklinks: { links: [] },
  };
