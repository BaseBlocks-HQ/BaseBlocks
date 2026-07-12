import {
  createDocument,
  createTextNode,
  textBlock,
  type OpenEditorBlock,
} from "@openeditor/core";
import type {
  BlockData,
  CalloutContent,
  CodeContent,
  DecisionTreeContent,
  DirectoryContent,
  FlowchartContent,
  FileContent,
  HeadingContent,
  ImageContent,
  LibraryContent,
  PageStructure,
  PageContent,
  ParagraphContent,
  QuicklinksContent,
  RichTextContent,
  SearchContent,
  SpacerContent,
} from "@baseblocks/domain";
import { convertBlockNoteDocument } from "./convert-blocknote";
import type { ConversionResult, ConversionWarning } from "./types";

const placeholder = (block: BlockData, reason: string): OpenEditorBlock => ({
  type: "baseblocksMigrationPlaceholder",
  attrs: {
    sourceBlockId: block.id,
    sourceType: block.type,
    reason,
  },
});

function convertBlock(
  block: BlockData,
  warnings: ConversionWarning[],
  pageTitles: ReadonlyMap<string, string>,
): {
  nodes: OpenEditorBlock[];
  converted: boolean;
  placeholderCount: number;
} {
  switch (block.type) {
    case "paragraph": {
      const content = block.content as ParagraphContent;
      return {
        nodes: [textBlock("paragraph", content.text)],
        converted: true,
        placeholderCount: 0,
      };
    }
    case "heading": {
      const content = block.content as HeadingContent;
      return {
        nodes: [
          textBlock("heading", content.text, { level: content.level ?? 2 }),
        ],
        converted: true,
        placeholderCount: 0,
      };
    }
    case "code": {
      const content = block.content as CodeContent;
      return {
        nodes: [
          {
            type: "codeBlock",
            attrs: { language: content.language ?? "plaintext" },
            content: content.text ? [createTextNode(content.text)] : [],
          },
        ],
        converted: true,
        placeholderCount: 0,
      };
    }
    case "callout": {
      const content = block.content as CalloutContent;
      return {
        nodes: [
          {
            type: "callout",
            attrs: {
              tone:
                content.variant === "error"
                  ? "danger"
                  : (content.variant ?? "info"),
            },
            content: [textBlock("paragraph", content.text)],
          },
        ],
        converted: true,
        placeholderCount: 0,
      };
    }
    case "flowchart": {
      const content = block.content as FlowchartContent;
      if (content.diagrams.length > 1) {
        warnings.push({
          code: "flattened-diagram-tabs",
          severity: "info",
          blockId: block.id,
          blockType: block.type,
          message: `${content.diagrams.length} legacy diagram tabs were preserved in document order without their tab presentation.`,
        });
      }
      const diagrams =
        content.diagrams.length > 0
          ? content.diagrams
          : [{ id: "default", label: "Diagram", mermaidCode: "" }];
      return {
        nodes: diagrams.map((diagram) => ({
          type: "mermaidDiagram",
          attrs: { code: diagram.mermaidCode },
        })),
        converted: true,
        placeholderCount: 0,
      };
    }
    case "divider":
      return {
        nodes: [{ type: "horizontalRule" }],
        converted: true,
        placeholderCount: 0,
      };
    case "spacer": {
      const content = block.content as SpacerContent;
      const paragraphCount: Record<SpacerContent["height"], number> = {
        small: 1,
        medium: 2,
        large: 3,
        xlarge: 4,
      };
      const count = paragraphCount[content.height];
      warnings.push({
        code: "normalized-spacer",
        severity: "info",
        blockId: block.id,
        blockType: block.type,
        message: `Legacy ${content.height} spacer was converted to ${count} empty ${count === 1 ? "paragraph" : "paragraphs"}.`,
      });
      return {
        nodes: Array.from({ length: count }, () => textBlock("paragraph", "")),
        converted: true,
        placeholderCount: 0,
      };
    }
    case "image": {
      const content = block.content as ImageContent;
      if (content.caption) {
        warnings.push({
          code: "image-caption",
          severity: "warning",
          blockId: block.id,
          blockType: block.type,
          message:
            "Image content converted, but its caption is not represented yet.",
        });
      }
      return {
        nodes: [
          {
            type: "image",
            attrs: {
              src: content.url,
              alt: content.alt ?? "",
              width: content.width ?? null,
              height: content.height ?? null,
            },
          },
        ],
        converted: true,
        placeholderCount: 0,
      };
    }
    case "file": {
      const content = block.content as FileContent;
      return {
        nodes: [
          {
            type: "attachment",
            attrs: {
              attachmentId: content.documentId ?? null,
              name: content.filename ?? "Attachment",
              mimeType: content.contentType ?? null,
              size: content.size ?? null,
              url: content.documentId
                ? `/api/files/${content.documentId}`
                : null,
            },
          },
        ],
        converted: true,
        placeholderCount: 0,
      };
    }
    case "quicklinks": {
      const content = block.content as QuicklinksContent;
      return {
        nodes: [
          {
            type: "baseblocksQuickLinks",
            attrs: { links: structuredClone(content.links) },
          },
        ],
        converted: true,
        placeholderCount: 0,
      };
    }
    case "page": {
      const content = block.content as PageContent;
      return {
        nodes: [
          {
            type: "page",
            attrs: { pageId: content.pageId, icon: "📄", href: null },
            content: [
              createTextNode(pageTitles.get(content.pageId) ?? "Untitled"),
            ],
          },
        ],
        converted: true,
        placeholderCount: 0,
      };
    }
    case "directory": {
      const content = block.content as DirectoryContent;
      return {
        nodes: [
          {
            type: "baseblocksDirectory",
            attrs: { directory: structuredClone(content) },
          },
        ],
        converted: true,
        placeholderCount: 0,
      };
    }
    case "search": {
      const content = block.content as SearchContent;
      return {
        nodes: [
          {
            type: "baseblocksSearch",
            attrs: { search: structuredClone(content) },
          },
        ],
        converted: true,
        placeholderCount: 0,
      };
    }
    case "library": {
      const content = block.content as LibraryContent;
      return {
        nodes: [
          {
            type: "baseblocksLibrary",
            attrs: { library: structuredClone(content) },
          },
        ],
        converted: true,
        placeholderCount: 0,
      };
    }
    case "decision-tree": {
      const content = block.content as DecisionTreeContent;
      let nestedPlaceholders = 0;
      const trees = content.trees.map((tree) => ({
        ...tree,
        nodes: tree.nodes.map((node) => {
          const converted = convertBlockNoteDocument(node.document);
          nestedPlaceholders += converted.placeholderCount;
          warnings.push(
            ...converted.warnings.map((warning) => ({
              ...warning,
              blockId: warning.blockId ?? block.id,
              blockType: block.type,
              message: `Decision tree option “${node.name}”: ${warning.message}`,
            })),
          );
          return {
            ...node,
            document: createDocument(
              converted.nodes.length > 0
                ? converted.nodes
                : [textBlock("paragraph", "")],
              {
                source: "baseblocks-decision-tree-converter",
                schemaVersion: 1,
              },
            ),
          };
        }),
      }));
      return {
        nodes: [
          {
            type: "baseblocksDecisionTree",
            attrs: {
              decisionTree: { trees, tabsMode: content.tabsMode ?? "row" },
            },
          },
        ],
        converted: true,
        placeholderCount: nestedPlaceholders,
      };
    }
    case "richtext": {
      const content = block.content as RichTextContent;
      const converted = convertBlockNoteDocument(content.document);
      warnings.push(
        ...converted.warnings.map((warning) => ({
          ...warning,
          blockId: warning.blockId ?? block.id,
          blockType: block.type,
        })),
      );
      return {
        nodes: converted.nodes,
        converted: true,
        placeholderCount: converted.placeholderCount,
      };
    }
    default: {
      const reason = `${block.type} does not have a V2 converter and extension yet.`;
      warnings.push({
        code: "unsupported-block",
        severity: "warning",
        blockId: block.id,
        blockType: block.type,
        message: reason,
      });
      return {
        nodes: [placeholder(block, reason)],
        converted: false,
        placeholderCount: 1,
      };
    }
  }
}

export function convertLegacyPageToOpenEditor(
  page: PageStructure,
  options: { pageTitles?: ReadonlyMap<string, string> } = {},
): ConversionResult {
  const warnings: ConversionWarning[] = [];
  let sourceBlockCount = 0;
  let convertedBlockCount = 0;
  let placeholderCount = 0;
  const pageTitles = options.pageTitles ?? new Map<string, string>();

  const sections = [...page.sections].sort(
    (left, right) => left.order - right.order,
  );
  const convertSections = (selectedSections: typeof sections) => {
    const converted: OpenEditorBlock[] = [];
    for (const section of selectedSections) {
      if (section.region === "aside") {
        warnings.push({
          code: "aside-layout",
          severity: "warning",
          message: `Aside section ${section.id} is rendered inline until V2 has an aside layout extension.`,
        });
      }

      const columns = [...section.columns]
        .sort((left, right) => left.order - right.order)
        .map((column) => {
          const blocks = [...column.blocks]
            .sort((left, right) => left.order - right.order)
            .flatMap((block) => {
              sourceBlockCount += 1;
              const result = convertBlock(block, warnings, pageTitles);
              if (result.converted) convertedBlockCount += 1;
              placeholderCount += result.placeholderCount;
              return result.nodes;
            });
          return blocks.length > 0 ? blocks : [textBlock("paragraph", "")];
        });

      if (columns.length > 1) {
        converted.push({
          type: "columns",
          content: columns.map((column) => ({
            type: "column",
            content: column,
          })),
        });
      } else {
        converted.push(...(columns[0] ?? []));
      }
    }
    return converted;
  };

  const content: OpenEditorBlock[] = [];
  if (page.tabs.length > 0) {
    content.push({
      type: "baseblocksPageTabs",
      attrs: {
        tabs: {
          tabs: page.tabs.map((tab) => ({
            id: tab.id,
            label: tab.label,
            document: createDocument(
              convertSections(
                sections.filter((section) => section.tabId === tab.id),
              ),
              {
                source: "baseblocks-legacy-tab-converter",
                schemaVersion: 1,
              },
            ),
          })),
        },
      },
    });

    const unassignedSections = sections.filter(
      (section) =>
        !section.tabId || !page.tabs.some((tab) => tab.id === section.tabId),
    );
    content.push(...convertSections(unassignedSections));
  } else {
    content.push(...convertSections(sections));
  }

  if (content.length === 0) {
    content.push(textBlock("paragraph", ""));
    warnings.push({
      code: "empty-page",
      severity: "info",
      message: "The legacy page is empty, so V2 created an empty paragraph.",
    });
  }

  return {
    document: createDocument(content, {
      source: "baseblocks-legacy-converter",
      schemaVersion: 2,
    }),
    warnings,
    sourceBlockCount,
    convertedBlockCount,
    placeholderCount,
  };
}
