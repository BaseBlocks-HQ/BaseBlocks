/**
 * Section element types and content definitions
 * Sections are complex pre-built page sections (hero, search, library, etc.)
 */

// Section element types
export type SectionType =
  | "hero" // Hero section (new)
  | "search" // Search functionality (moved from blocks)
  | "library" // Document library (moved from blocks)
  | "quicklinks"; // Quick links grid (moved from blocks)

// Section content interfaces

export interface HeroContent {
  title: string;
  subtitle?: string;
  backgroundUrl?: string;
  ctaText?: string;
  ctaUrl?: string;
  alignment?: "left" | "center" | "right";
}

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
  | HeroContent
  | SearchContent
  | LibraryContent
  | QuicklinksContent;

// Default content for new sections
export const DEFAULT_SECTION_CONTENT: Record<SectionType, SectionContentUnion> =
  {
    hero: {
      title: "Welcome",
      subtitle: "Your subtitle here",
      alignment: "center",
    },
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
