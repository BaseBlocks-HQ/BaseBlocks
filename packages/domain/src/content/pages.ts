import type { PageAccessPolicy } from "../access/page-access";

export interface PageListItem {
  _id: string;
  title: string;
  slug: string;
  icon?: string;
  parentId?: string;
  order: number;
  showInNavigation?: boolean;
  hasPageBlockReference?: boolean;
  accessPolicy?: PageAccessPolicy;
}

export interface PageWithChildren extends PageListItem {
  children: PageWithChildren[];
}
