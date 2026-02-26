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

export interface PageWithChildren extends PageListItem {
  children: PageWithChildren[];
}
