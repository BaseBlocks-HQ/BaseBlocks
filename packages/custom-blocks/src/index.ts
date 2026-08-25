import {
  defineOpenEditorCustomBlock,
  type OpenEditorCustomBlockSafeHtml,
} from "@openeditor/custom-block";
import {
  createDirectoryContent,
  directoryToText,
  migrateDirectoryContentV1,
  parseDirectoryContent,
} from "./directory";
import { parseDecisionTreeValue } from "./decision-tree";
import { parseQuickLinksData, safeQuickLinkHref } from "./quick-links";

export const directoryBlock = defineOpenEditorCustomBlock({
  id: "baseblocks.directory",
  label: "Directory",
  version: 2,
  createData: createDirectoryContent,
  parseData: parseDirectoryContent,
  toHtml: ({ data }) => ({
    tag: "div",
    children: data.directories.map((directory) => ({
      tag: "section",
      children: [
        ...(data.directories.length > 1
          ? [{ tag: "strong" as const, children: [directory.label] }]
          : []),
        {
          tag: "table" as const,
          children: [
            { tag: "caption" as const, children: [directory.label] },
            {
              tag: "thead" as const,
              children: [
                {
                  tag: "tr" as const,
                  children: directory.columns.map((column) => ({
                    tag: "th" as const,
                    attrs: { scope: "col" as const },
                    children: [column.name],
                  })),
                },
              ],
            },
            {
              tag: "tbody" as const,
              children: directory.rows.map((row) => ({
                tag: "tr" as const,
                children: directory.columns.map(({ id }) => ({
                  tag: "td" as const,
                  children: [row.cells[id] ?? ""],
                })),
              })),
            },
          ],
        },
      ],
    })),
  }),
  toText: ({ data }) => directoryToText(data),
});

export const decisionTreeBlock = defineOpenEditorCustomBlock({
  id: "baseblocks.decision-tree",
  label: "Decision Tree",
  version: 1,
  createData: () => ({
    trees: [{ id: "default", label: "Tree 1", nodes: [] }],
    tabsMode: "row" as const,
  }),
  parseData: parseDecisionTreeValue,
  toHtml: ({ data, renderDocument }) => ({
    tag: "div",
    children: data.trees.map((tree) => ({
      tag: "section",
      children: [
        { tag: "strong", children: [tree.label] },
        {
          tag: "ul",
          children: tree.nodes.map((node) => ({
            tag: "li",
            children: [node.name, renderDocument(node.document)],
          })),
        },
      ],
    })),
  }),
  toText: ({ data, documentToText }) =>
    data.trees
      .flatMap((tree) => [
        tree.label,
        ...tree.nodes.map((node) =>
          [node.name, documentToText(node.document)].filter(Boolean).join("\n"),
        ),
      ])
      .join("\n"),
});

export const quickLinksBlock = defineOpenEditorCustomBlock({
  id: "baseblocks.quick-links",
  label: "Quick Links",
  version: 2,
  createData: () => ({ links: [] }),
  parseData: parseQuickLinksData,
  migrate: ({ version, data }) => {
    const rawLinks = (data as { links?: unknown }).links;
    if (version !== 1 || !Array.isArray(rawLinks))
      throw new Error("Unsupported Quick Links version.");
    const links = rawLinks.flatMap((item: unknown) => {
      if (
        !item ||
        typeof item !== "object" ||
        Array.isArray(item) ||
        (item as Record<string, unknown>).linkType !== "website"
      )
        return [];
      const link = item as Record<string, unknown>;
      const artwork =
        link.artwork &&
        typeof link.artwork === "object" &&
        !Array.isArray(link.artwork)
          ? (link.artwork as Record<string, unknown>)
          : null;
      return [
        {
          id: link.id,
          title: link.title,
          url: link.url,
          ...(artwork?.kind === "asset" && typeof artwork.assetId === "string"
            ? { imageAssetId: artwork.assetId }
            : {}),
        },
      ];
    });
    return {
      blockId: "baseblocks.quick-links",
      version: 2,
      data: parseQuickLinksData({ links }),
    };
  },
  assets: ({ links }) =>
    links.flatMap((link, index) =>
      link.imageAssetId
        ? [
            {
              id: link.imageAssetId,
              path: `$.data.links[${index}].imageAssetId`,
            },
          ]
        : [],
    ),
  toHtml: ({ data }) =>
    ({
      tag: "ul",
      children: data.links.flatMap<OpenEditorCustomBlockSafeHtml>((link) => {
        const href = safeQuickLinkHref(link);
        return href
          ? [
              {
                tag: "li" as const,
                children: [
                  {
                    tag: "a" as const,
                    attrs: { href },
                    children: [link.title],
                  },
                ],
              },
            ]
          : [{ tag: "li" as const, children: [link.title] }];
      }),
    }) as OpenEditorCustomBlockSafeHtml,
  toText: ({ data }) =>
    data.links.map((link) => `${link.title}: ${link.url}`).join("\n"),
});

export const baseBlocksCustomBlocks = [
  directoryBlock,
  decisionTreeBlock,
  quickLinksBlock,
] as const;

export { migrateDirectoryContentV1 };
