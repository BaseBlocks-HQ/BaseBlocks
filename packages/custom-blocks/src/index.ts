import {
  defineOpenEditorCustomBlock,
  type OpenEditorCustomBlockJsonObject,
  type OpenEditorCustomBlockSafeHtml,
} from "@openeditor/custom-block";
import {
  createDirectoryContent,
  directoryToText,
  type DirectoryContent,
} from "./directory";
import type { DecisionTreeValue } from "./decision-tree";
import {
  decisionTreeManifest,
  directoryManifest,
  quickLinksManifest,
} from "./manifests";
import { safeQuickLinkHref, type QuickLink } from "./quick-links";

type DirectoryBlockData = DirectoryContent & OpenEditorCustomBlockJsonObject;
export const directoryBlock = defineOpenEditorCustomBlock<DirectoryBlockData>({
  ...directoryManifest,
  initialData: () => createDirectoryContent() as DirectoryBlockData,
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
                    attrs: { scope: "col" },
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

type DecisionTreeBlockData = DecisionTreeValue &
  OpenEditorCustomBlockJsonObject;
export const decisionTreeBlock =
  defineOpenEditorCustomBlock<DecisionTreeBlockData>({
    ...decisionTreeManifest,
    initialData: () => ({
      trees: [{ id: "default", label: "Tree 1", nodes: [] }],
      tabsMode: "row",
    }),
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
            [node.name, documentToText(node.document)]
              .filter(Boolean)
              .join("\n"),
          ),
        ])
        .join("\n"),
  });

export type QuickLinksData = {
  links: QuickLink[];
} & OpenEditorCustomBlockJsonObject;
export const quickLinksBlock = defineOpenEditorCustomBlock<QuickLinksData>({
  ...quickLinksManifest,
  initialData: () => ({ links: [] }),
  validateData: ({ links }) =>
    links.every((link) => safeQuickLinkHref(link))
      ? null
      : "Quick Links contains an unsafe destination.",
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
    }) as unknown as OpenEditorCustomBlockSafeHtml,
  toText: ({ data }) =>
    data.links
      .filter((link) => safeQuickLinkHref(link))
      .map((link) => `${link.title}: ${link.url}`)
      .join("\n"),
});

export const baseBlocksCustomBlocks = [
  directoryBlock,
  decisionTreeBlock,
  quickLinksBlock,
] as const;
