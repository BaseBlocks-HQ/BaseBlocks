import type { OpenEditorDocument, ProseMirrorNode } from "@openeditor/core";
import { baseBlocksBlockRegistry } from "./block-registry";

type PageTab = {
  id: string;
  label: string;
  document: OpenEditorDocument;
};

export type PortableExportOptions = {
  /** Released image assets referenced by BaseBlocks custom blocks. */
  imageAssetIds?: ReadonlySet<string>;
};

type QuickLinkExportData = {
  links?: readonly {
    id?: unknown;
    title?: unknown;
    url?: unknown;
    imageAssetId?: unknown;
  }[];
};

const QUICK_LINKS_BLOCK_ID = "baseblocks.quick-links";

const readPageTabs = (
  document: OpenEditorDocument,
): readonly PageTab[] | null => {
  if (document.content.length !== 1) return null;
  const node = document.content[0];
  if (node?.type !== "baseblocksPageTabs") return null;
  const tabs = (node.attrs?.tabs as { tabs?: readonly PageTab[] } | undefined)
    ?.tabs;
  return Array.isArray(tabs) && tabs.length > 0 ? tabs : null;
};

function createExportImageNode(
  imageId: string,
  alt: string,
  id: string,
): ProseMirrorNode {
  return {
    type: "image",
    attrs: {
      "openeditor-id": id,
      imageId,
      src: null,
      alt,
      width: null,
      height: null,
    },
  };
}

function projectQuickLinksForExport(
  node: ProseMirrorNode,
  imageAssetIds: ReadonlySet<string>,
): readonly ProseMirrorNode[] | null {
  if (
    node.type !== "customBlock" ||
    node.attrs?.blockId !== QUICK_LINKS_BLOCK_ID
  )
    return null;

  const resolved = baseBlocksBlockRegistry.resolve(node);
  if (resolved.status !== "ready") return null;
  const data = resolved.data as QuickLinkExportData;
  if (!Array.isArray(data.links)) return null;

  const nodeId =
    typeof node.attrs?.["openeditor-id"] === "string"
      ? node.attrs["openeditor-id"]
      : "quick-links";

  return data.links.flatMap((link, index) => {
    if (typeof link.title !== "string" || typeof link.url !== "string") {
      return [];
    }

    const linkNode: ProseMirrorNode = {
      type: "paragraph",
      attrs: { "openeditor-id": `${nodeId}-export-link-${index}` },
      content: [
        {
          type: "text",
          text: link.title,
          marks: link.url
            ? [{ type: "link", attrs: { href: link.url } }]
            : undefined,
        },
      ],
    };
    const imageId =
      typeof link.imageAssetId === "string" &&
      imageAssetIds.has(link.imageAssetId)
        ? link.imageAssetId
        : null;

    return imageId
      ? [
          createExportImageNode(
            imageId,
            link.title,
            `${nodeId}-export-image-${index}`,
          ),
          linkNode,
        ]
      : [linkNode];
  });
}

function projectNodesForExport(
  nodes: ProseMirrorNode[],
  imageAssetIds: ReadonlySet<string>,
): ProseMirrorNode[] {
  let changed = false;
  const projected: ProseMirrorNode[] = [];

  for (const node of nodes) {
    const quickLinks = projectQuickLinksForExport(node, imageAssetIds);
    if (quickLinks) {
      changed = true;
      projected.push(...quickLinks);
      continue;
    }

    const content = node.content
      ? projectNodesForExport(node.content, imageAssetIds)
      : node.content;
    if (content && content !== node.content) {
      changed = true;
      projected.push({ ...node, content });
    } else {
      projected.push(node);
    }
  }

  return changed ? projected : nodes;
}

/**
 * Converts BaseBlocks-only structures into ordinary OpenEditor blocks for
 * HTML, text, Markdown, and DOCX export.
 */
export function projectBaseBlocksDocumentForPortableExport(
  document: OpenEditorDocument,
  options: PortableExportOptions = {},
): OpenEditorDocument {
  const tabs = readPageTabs(document);
  const imageAssetIds = options.imageAssetIds;
  const releasedImageAssetIds = imageAssetIds ?? new Set<string>();

  if (!tabs && !imageAssetIds?.size) return document;

  const content = tabs
    ? tabs.flatMap<ProseMirrorNode>((tab) => [
        {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: tab.label }],
        },
        ...projectNodesForExport(tab.document.content, releasedImageAssetIds),
      ])
    : projectNodesForExport(document.content, releasedImageAssetIds);

  if (!tabs && content === document.content) return document;
  return { ...document, content };
}
