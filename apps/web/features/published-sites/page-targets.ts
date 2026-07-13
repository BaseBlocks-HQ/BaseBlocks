import type { OpenEditorPageSnapshot } from "@openeditor/react";

export type PublishedPageSummary = {
  _id: string;
  title: string;
  slug: string;
  icon?: string;
  parentId?: string;
};

export type PublishedPageTarget = OpenEditorPageSnapshot & {
  path: string[];
};

export function buildPublishedPageTargets(
  pages: readonly PublishedPageSummary[],
): ReadonlyMap<string, PublishedPageTarget> {
  const pagesById = new Map(pages.map((page) => [page._id, page]));
  const targets = new Map<string, PublishedPageTarget>();

  for (const page of pages) {
    const path: string[] = [];
    const visited = new Set<string>();
    let current: PublishedPageSummary | undefined = page;

    while (current && !visited.has(current._id)) {
      visited.add(current._id);
      path.unshift(current.slug);
      current = current.parentId ? pagesById.get(current.parentId) : undefined;
    }

    targets.set(page._id, {
      pageId: page._id,
      title: page.title,
      icon: page.icon ?? "📄",
      path,
    });
  }

  return targets;
}
