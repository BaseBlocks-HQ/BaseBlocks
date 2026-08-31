import type { OpenEditorDocument, ProseMirrorNode } from "@openeditor/document";

export type ChildPageProjection = {
  pageId: string;
  title: string;
  icon?: string | null;
  href?: string | null;
};

const pageNode = (page: ChildPageProjection): ProseMirrorNode => ({
  type: "page",
  attrs: {
    "openeditor-id": `page-${page.pageId}`,
    pageId: page.pageId,
    icon: page.icon ?? "📄",
    href: page.href ?? `?page=${page.pageId}`,
  },
  content: [{ type: "text", text: page.title || "Untitled" }],
});

export function pageProjections(
  document: OpenEditorDocument,
): ChildPageProjection[] {
  const pages: ChildPageProjection[] = [];
  const visit = (value: unknown): void => {
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (!value || typeof value !== "object") return;
    const node = value as Record<string, unknown>;
    if (node.type === "page") {
      const attrs = node.attrs as Record<string, unknown> | undefined;
      const pageId = attrs?.pageId;
      if (typeof pageId === "string" && pageId) {
        const content = Array.isArray(node.content) ? node.content : [];
        const title = content
          .flatMap((child) =>
            child &&
            typeof child === "object" &&
            typeof (child as { text?: unknown }).text === "string"
              ? [(child as { text: string }).text]
              : [],
          )
          .join("");
        pages.push({
          pageId,
          title: title || "Untitled",
          icon: typeof attrs?.icon === "string" ? attrs.icon : null,
          href: typeof attrs?.href === "string" ? attrs.href : null,
        });
      }
    }
    Object.values(node).forEach(visit);
  };
  visit(document);
  return pages;
}

/**
 * Rewrites embedded page nodes from the authoritative hierarchy projection.
 * Non-page content and the position of still-existing page nodes are preserved;
 * newly projected children are appended to the first tab or the root document.
 */
export function projectChildPages(
  document: OpenEditorDocument,
  children: readonly ChildPageProjection[],
): OpenEditorDocument {
  const expected = new Map(children.map((child) => [child.pageId, child]));
  const seen = new Set<string>();
  const rewrite = (value: unknown): unknown => {
    if (Array.isArray(value)) {
      return value.flatMap((item) => {
        if (item && typeof item === "object") {
          const node = item as Record<string, unknown>;
          if (node.type === "page") {
            const attrs = node.attrs as Record<string, unknown> | undefined;
            const pageId = attrs?.pageId;
            if (
              typeof pageId !== "string" ||
              !expected.has(pageId) ||
              seen.has(pageId)
            )
              return [];
            seen.add(pageId);
            return [pageNode(expected.get(pageId)!)];
          }
        }
        return [rewrite(item)];
      });
    }
    if (!value || typeof value !== "object") return value;
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [key, rewrite(child)]),
    );
  };
  const synchronized = rewrite(document) as OpenEditorDocument;
  const missing = children
    .filter((child) => !seen.has(child.pageId))
    .map(pageNode);
  if (missing.length === 0) return synchronized;

  const first = synchronized.content[0];
  if (first?.type === "baseblocksPageTabs") {
    const tabs = (first.attrs?.tabs as { tabs?: unknown } | undefined)?.tabs;
    const firstTab = Array.isArray(tabs) ? tabs[0] : undefined;
    if (firstTab && typeof firstTab === "object") {
      const tab = firstTab as { document?: OpenEditorDocument };
      if (tab.document?.type === "doc") {
        tab.document = {
          ...tab.document,
          content: [...tab.document.content, ...missing],
        };
        return synchronized;
      }
    }
  }
  return { ...synchronized, content: [...synchronized.content, ...missing] };
}

export function reconcileChildPageProjection(
  local: OpenEditorDocument,
  authoritative: OpenEditorDocument,
): OpenEditorDocument {
  return projectChildPages(local, pageProjections(authoritative));
}

export function hasSameChildPageProjection(
  left: OpenEditorDocument,
  right: OpenEditorDocument,
): boolean {
  const ids = (document: OpenEditorDocument) =>
    pageProjections(document).map((page) => page.pageId);
  return JSON.stringify(ids(left)) === JSON.stringify(ids(right));
}

export function removeChildPageProjection(
  document: OpenEditorDocument,
): OpenEditorDocument {
  const remove = (value: unknown): unknown => {
    if (Array.isArray(value)) {
      return value.flatMap((item) =>
        item &&
        typeof item === "object" &&
        (item as { type?: unknown }).type === "page"
          ? []
          : [remove(item)],
      );
    }
    if (!value || typeof value !== "object") return value;
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [key, remove(child)]),
    );
  };
  return remove(document) as OpenEditorDocument;
}

export function hasSameNonPageContent(
  left: OpenEditorDocument,
  right: OpenEditorDocument,
): boolean {
  return (
    JSON.stringify(removeChildPageProjection(left)) ===
    JSON.stringify(removeChildPageProjection(right))
  );
}
