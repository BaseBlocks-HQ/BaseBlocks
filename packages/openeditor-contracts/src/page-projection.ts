import type { OpenEditorDocument, ProseMirrorNode } from "@openeditor/core";
import type {
  OpenEditorCustomBlockDataSchema,
  OpenEditorCustomBlockManifest,
} from "@openeditor/custom-block";
import {
  validateOpenEditorCustomBlockDataValue,
  validateOpenEditorCustomBlockEnvelope,
} from "@openeditor/custom-block";

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

function mapDeclaredValue(
  value: unknown,
  schema: OpenEditorCustomBlockDataSchema,
  mapDocument: (document: OpenEditorDocument) => OpenEditorDocument,
): unknown {
  if (schema.type === "document") {
    if (
      !value ||
      typeof value !== "object" ||
      (value as { type?: unknown }).type !== "doc" ||
      (value as { version?: unknown }).version !== 1 ||
      !Array.isArray((value as { content?: unknown }).content)
    )
      return value;
    return mapDocument(value as OpenEditorDocument);
  }
  if (schema.type === "oneOf") {
    for (const variant of schema.variants) {
      const valid = validateOpenEditorCustomBlockDataValue(
        value,
        variant,
      ).valid;
      if (valid) return mapDeclaredValue(value, variant, mapDocument);
    }
    return value;
  }
  if (schema.type === "array" && schema.items && Array.isArray(value))
    return value.map((item) =>
      mapDeclaredValue(item, schema.items!, mapDocument),
    );
  if (
    schema.type !== "object" ||
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  )
    return value;
  let changed = false;
  const result = { ...(value as Record<string, unknown>) };
  for (const [key, child] of Object.entries(result)) {
    const childSchema = schema.properties?.[key];
    if (!childSchema) continue;
    const mapped = mapDeclaredValue(child, childSchema, mapDocument);
    if (mapped !== child) {
      result[key] = mapped;
      changed = true;
    }
  }
  return changed ? result : value;
}

/** Map only root and manifest-declared OpenEditor document fields. */
export function mapOpenEditorDocuments(
  document: OpenEditorDocument,
  manifests: readonly OpenEditorCustomBlockManifest[],
  transform: (document: OpenEditorDocument) => OpenEditorDocument,
): OpenEditorDocument {
  const byId = new Map<string, OpenEditorCustomBlockManifest>(
    manifests.map((manifest) => [manifest.id, manifest]),
  );
  const visitNode = (node: ProseMirrorNode): ProseMirrorNode => {
    let next = node;
    if (Array.isArray(node.content)) {
      let changed = false;
      const content = node.content.map((child) => {
        const mapped = visitNode(child);
        changed ||= mapped !== child;
        return mapped;
      });
      if (changed) next = { ...next, content };
    }
    if (node.type === "customBlock" && node.attrs) {
      const manifest =
        typeof node.attrs.blockId === "string"
          ? byId.get(node.attrs.blockId)
          : undefined;
      const validation = manifest
        ? validateOpenEditorCustomBlockEnvelope(node.attrs, manifests)
        : null;
      if (manifest && validation?.valid && !("status" in validation)) {
        const data = mapDeclaredValue(
          node.attrs.data,
          manifest.dataSchema,
          visitDocument,
        );
        if (data !== node.attrs.data)
          next = { ...next, attrs: { ...node.attrs, data } };
      }
    }
    return next;
  };
  function visitDocument(current: OpenEditorDocument): OpenEditorDocument {
    let changed = false;
    const content = current.content.map((node) => {
      const next = visitNode(node);
      changed ||= next !== node;
      return next;
    });
    const structural = changed ? { ...current, content } : current;
    return transform(structural);
  }
  return visitDocument(document);
}

export function pageProjections(
  document: OpenEditorDocument,
  manifests: readonly OpenEditorCustomBlockManifest[],
): ChildPageProjection[] {
  const pages: ChildPageProjection[] = [];
  mapOpenEditorDocuments(document, manifests, (current) => {
    for (const node of current.content)
      if (node.type === "page") {
        const pageId = node.attrs?.pageId;
        if (typeof pageId !== "string" || !pageId) continue;
        pages.push({
          pageId,
          title:
            (node.content ?? []).map((child) => child.text ?? "").join("") ||
            "Untitled",
          icon: typeof node.attrs?.icon === "string" ? node.attrs.icon : null,
          href: typeof node.attrs?.href === "string" ? node.attrs.href : null,
        });
      }
    return current;
  });
  return pages;
}

export function projectChildPages(
  document: OpenEditorDocument,
  children: readonly ChildPageProjection[],
  manifests: readonly OpenEditorCustomBlockManifest[],
): OpenEditorDocument {
  const expected = new Map(children.map((child) => [child.pageId, child]));
  const seen = new Set<string>();
  const rewritten = mapOpenEditorDocuments(document, manifests, (current) => {
    const content = current.content.flatMap((node) => {
      if (node.type !== "page") return [node];
      const pageId = node.attrs?.pageId;
      if (
        typeof pageId !== "string" ||
        !expected.has(pageId) ||
        seen.has(pageId)
      )
        return [];
      seen.add(pageId);
      return [pageNode(expected.get(pageId)!)];
    });
    return content.length === current.content.length &&
      content.every((node, index) => node === current.content[index])
      ? current
      : { ...current, content };
  });
  const missing = children
    .filter((child) => !seen.has(child.pageId))
    .map(pageNode);
  if (missing.length === 0) return rewritten;
  const first = rewritten.content[0];
  if (
    first?.type === "customBlock" &&
    first.attrs?.blockId === "baseblocks.page-tabs"
  ) {
    const data = first.attrs.data as
      | { tabs?: Array<{ document?: OpenEditorDocument }> }
      | undefined;
    const firstTab = data?.tabs?.[0];
    if (firstTab?.document?.type === "doc") {
      return {
        ...rewritten,
        content: [
          {
            ...first,
            attrs: {
              ...first.attrs,
              data: {
                ...data,
                tabs: [
                  {
                    ...firstTab,
                    document: {
                      ...firstTab.document,
                      content: [...firstTab.document.content, ...missing],
                    },
                  },
                  ...(data?.tabs?.slice(1) ?? []),
                ],
              },
            },
          },
          ...rewritten.content.slice(1),
        ],
      };
    }
  }
  return { ...rewritten, content: [...rewritten.content, ...missing] };
}

export function removeChildPageProjection(
  document: OpenEditorDocument,
  manifests: readonly OpenEditorCustomBlockManifest[],
): OpenEditorDocument {
  return mapOpenEditorDocuments(document, manifests, (current) => ({
    ...current,
    content: current.content.filter((node) => node.type !== "page"),
  }));
}

export function reconcileChildPageProjection(
  local: OpenEditorDocument,
  authoritative: OpenEditorDocument,
  manifests: readonly OpenEditorCustomBlockManifest[],
): OpenEditorDocument {
  return projectChildPages(
    local,
    pageProjections(authoritative, manifests),
    manifests,
  );
}
export function hasSameChildPageProjection(
  left: OpenEditorDocument,
  right: OpenEditorDocument,
  manifests: readonly OpenEditorCustomBlockManifest[],
): boolean {
  const ids = (document: OpenEditorDocument) =>
    pageProjections(document, manifests).map((page) => page.pageId);
  return JSON.stringify(ids(left)) === JSON.stringify(ids(right));
}
export function hasSameNonPageContent(
  left: OpenEditorDocument,
  right: OpenEditorDocument,
  manifests: readonly OpenEditorCustomBlockManifest[],
): boolean {
  return (
    JSON.stringify(removeChildPageProjection(left, manifests)) ===
    JSON.stringify(removeChildPageProjection(right, manifests))
  );
}
