import {
  defineOpenEditorCustomBlock,
  type OpenEditorCustomBlockSafeHtml,
} from "@openeditor/custom-block";
import {
  createDirectoryContent,
  directoryToText,
  parseDirectoryContent,
} from "./directory";
import { parseDecisionTreeValue } from "./decision-tree";
import { parseQuickLinksData, safeQuickLinkHref } from "./quick-links";

export const directoryBlock = defineOpenEditorCustomBlock({
  id: "baseblocks.directory",
  label: "Directory",
  version: 1,
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
                  children: directory.columnIds.map((_columnId, index) => ({
                    tag: "th" as const,
                    attrs: { scope: "col" as const },
                    children: [`Column ${index + 1}`],
                  })),
                },
              ],
            },
            {
              tag: "tbody" as const,
              children: directory.rows.map((row) => ({
                tag: "tr" as const,
                children: directory.columnIds.map((columnId) => ({
                  tag: "td" as const,
                  children: [row.cells[columnId] ?? ""],
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
  version: 1,
  createData: () => ({ links: [] }),
  parseData: parseQuickLinksData,
  assets: ({ links }) =>
    links.flatMap((link, index) =>
      link.artwork?.kind === "asset"
        ? [
            {
              id: link.artwork.assetId,
              path: `$.data.links[${index}].artwork.assetId`,
            },
          ]
        : [],
    ),
  toHtml: ({ data }) =>
    ({
      tag: "ul",
      children: data.links.flatMap<OpenEditorCustomBlockSafeHtml>((link) => {
        const href = safeQuickLinkHref(link);
        return href && link.linkType !== "app"
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
