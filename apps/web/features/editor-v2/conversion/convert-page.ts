import {
  createDocument,
  createTextNode,
  textBlock,
  type OpenEditorBlock,
} from "@openeditor/core";
import type {
  BlockData,
  CodeContent,
  HeadingContent,
  ImageContent,
  PageStructure,
  ParagraphContent,
  QuicklinksContent,
  RichTextContent,
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
    case "divider":
      return {
        nodes: [{ type: "horizontalRule" }],
        converted: true,
        placeholderCount: 0,
      };
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
): ConversionResult {
  const warnings: ConversionWarning[] = [];
  let sourceBlockCount = 0;
  let convertedBlockCount = 0;
  let placeholderCount = 0;

  if (page.tabs.length > 0) {
    warnings.push({
      code: "flattened-tabs",
      severity: "warning",
      message: `${page.tabs.length} legacy page tabs are flattened into document order for now.`,
    });
  }

  const sections = [...page.sections].sort(
    (left, right) => left.order - right.order,
  );
  const content: OpenEditorBlock[] = [];

  for (const section of sections) {
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
            const result = convertBlock(block, warnings);
            if (result.converted) convertedBlockCount += 1;
            placeholderCount += result.placeholderCount;
            return result.nodes;
          });
        return blocks.length > 0 ? blocks : [textBlock("paragraph", "")];
      });

    if (columns.length > 1) {
      content.push({
        type: "columns",
        content: columns.map((column) => ({ type: "column", content: column })),
      });
    } else {
      content.push(...(columns[0] ?? []));
    }
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
      schemaVersion: 1,
    }),
    warnings,
    sourceBlockCount,
    convertedBlockCount,
    placeholderCount,
  };
}
