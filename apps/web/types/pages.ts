/**
 * Page type definitions
 */
import type { Page, PageId } from "./convex";
import type { TypedBlock } from "./blocks";

// Page list item (for sidebar display)
export interface PageListItem {
  _id: string;
  title: string;
  slug: string;
  icon?: string;
  parentId?: string;
  order: number;
  isPublished: boolean;
}

// Page with children (for tree navigation)
export interface PageWithChildren extends PageListItem {
  children: PageWithChildren[];
}

// Page with blocks (for editor)
export interface PageWithBlocks {
  page: Page;
  blocks: TypedBlock[];
}

// Site with company (for editor context)
export interface SiteWithCompany {
  site: {
    _id: string;
    name: string;
    slug: string;
    description?: string;
    isPublished: boolean;
    defaultPageId?: string;
    settings: {
      favicon?: string;
      ogImage?: string;
      headerType: "logo" | "text";
      navigationStyle: "sidebar" | "topnav";
    };
  };
  company: {
    _id: string;
    name: string;
    slug: string;
    logoUrl?: string;
    settings: {
      primaryColor?: string;
      customDomain?: string;
    };
  };
}
