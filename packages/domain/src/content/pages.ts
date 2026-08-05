export const MAX_PAGE_TITLE_LENGTH = 200;

export function normalizePageTitle(title: string): string {
  const normalized = title.trim();
  if (!normalized) throw new Error("Page title cannot be empty");
  if (normalized.length > MAX_PAGE_TITLE_LENGTH) {
    throw new Error(
      `Page title cannot exceed ${MAX_PAGE_TITLE_LENGTH} characters`,
    );
  }
  return normalized;
}

export interface PageListItem {
  _id: string;
  title: string;
  slug: string;
  icon?: string;
  parentId?: string;
  order: number;
}

export interface PageWithChildren extends PageListItem {
  children: PageWithChildren[];
}
