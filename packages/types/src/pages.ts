/**
 * Page type definitions
 */

// Page list item (for sidebar display)
export interface PageListItem {
  _id: string;
  title: string;
  slug: string;
  icon?: string;
  parentId?: string;
  order: number;
  isPublished: boolean;
  isSubpageContent?: boolean;
}

// Page with children (for tree navigation)
export interface PageWithChildren extends PageListItem {
  children: PageWithChildren[];
}
