import type { OpenEditorPageSnapshot } from "@openeditor/react";

type PublishedPageSummary = {
  _id: string;
  title: string;
  slug: string;
  icon?: string;
  children?: readonly PublishedPageSummary[];
};

export type PublishedPageTarget = OpenEditorPageSnapshot & {
  path: string[];
};

export function buildPublishedPageTargets(
  pages: readonly PublishedPageSummary[],
): ReadonlyMap<string, PublishedPageTarget> {
  const targets = new Map<string, PublishedPageTarget>();

  const visit = (
    items: readonly PublishedPageSummary[],
    parentPath: string[],
  ) => {
    for (const page of items) {
      const path = [...parentPath, page.slug];
      targets.set(page._id, {
        pageId: page._id,
        title: page.title,
        icon: page.icon ?? "📄",
        path,
      });
      if (page.children?.length) visit(page.children, path);
    }
  };

  visit(pages, []);

  return targets;
}
