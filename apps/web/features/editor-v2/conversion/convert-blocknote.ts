import {
  createTextNode,
  type OpenEditorBlock,
  type ProseMirrorMark,
  type ProseMirrorNode,
} from "@openeditor/core";
import type { ConversionWarning } from "./types";

type JsonRecord = Record<string, unknown>;

interface BlockNoteBlock {
  id: string;
  type: string;
  props: JsonRecord;
  content: unknown;
  children: BlockNoteBlock[];
}

interface BlockNoteConversion {
  nodes: OpenEditorBlock[];
  warnings: ConversionWarning[];
  placeholderCount: number;
}

const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readBlock = (value: unknown, index: number): BlockNoteBlock | null => {
  if (!isRecord(value) || typeof value.type !== "string") return null;
  return {
    id: typeof value.id === "string" ? value.id : `blocknote-${index}`,
    type: value.type,
    props: isRecord(value.props) ? value.props : {},
    content: value.content,
    children: Array.isArray(value.children)
      ? value.children
          .map((child, childIndex) => readBlock(child, childIndex))
          .filter((child): child is BlockNoteBlock => child !== null)
      : [],
  };
};

const mark = (
  type: ProseMirrorMark["type"],
  attrs?: JsonRecord,
): ProseMirrorMark => ({
  type,
  ...(attrs ? { attrs } : {}),
});

function marksFromStyles(
  styles: unknown,
  warnings: ConversionWarning[],
  block: BlockNoteBlock,
): ProseMirrorMark[] {
  if (!isRecord(styles)) return [];
  const marks: ProseMirrorMark[] = [];
  if (styles.bold === true) marks.push(mark("bold"));
  if (styles.italic === true) marks.push(mark("italic"));
  if (styles.underline === true) marks.push(mark("underline"));
  if (styles.strike === true) marks.push(mark("strike"));
  if (styles.code === true) marks.push(mark("code"));

  for (const style of ["textColor", "backgroundColor"] as const) {
    if (typeof styles[style] === "string" && styles[style] !== "default") {
      warnings.push({
        code: "unsupported-inline-style",
        severity: "warning",
        blockId: block.id,
        message: `BlockNote ${style} "${styles[style]}" is not represented in Open Editor yet.`,
      });
    }
  }
  return marks;
}

function inlineContent(
  value: unknown,
  warnings: ConversionWarning[],
  block: BlockNoteBlock,
  inheritedMarks: ProseMirrorMark[] = [],
): ProseMirrorNode[] {
  if (typeof value === "string") {
    return value ? [createTextNode(value, inheritedMarks)] : [];
  }
  if (!Array.isArray(value)) return [];

  return value.flatMap((item): ProseMirrorNode[] => {
    if (typeof item === "string") {
      return item ? [createTextNode(item, inheritedMarks)] : [];
    }
    if (!isRecord(item) || typeof item.type !== "string") return [];

    if (item.type === "text") {
      const text = typeof item.text === "string" ? item.text : "";
      const marks = [
        ...inheritedMarks,
        ...marksFromStyles(item.styles, warnings, block),
      ];
      return text ? [createTextNode(text, marks)] : [];
    }

    if (item.type === "link") {
      const href = typeof item.href === "string" ? item.href : "";
      return inlineContent(item.content, warnings, block, [
        ...inheritedMarks,
        mark("link", { href }),
      ]);
    }

    warnings.push({
      code: "unsupported-inline-content",
      severity: "warning",
      blockId: block.id,
      message: `BlockNote inline content "${item.type}" is flattened to its text content.`,
    });
    if (typeof item.content === "string" || Array.isArray(item.content)) {
      return inlineContent(item.content, warnings, block, inheritedMarks);
    }
    return [];
  });
}

const textFromInline = (value: unknown): string => {
  if (typeof value === "string") return value;
  if (!Array.isArray(value)) return "";
  return value
    .map((item) => {
      if (typeof item === "string") return item;
      if (!isRecord(item)) return "";
      if (typeof item.text === "string") return item.text;
      return textFromInline(item.content);
    })
    .join("");
};

const textAttrs = (
  block: BlockNoteBlock,
  extra: JsonRecord = {},
): JsonRecord => ({
  ...extra,
  ...(typeof block.props.textAlignment === "string" &&
  block.props.textAlignment !== "left"
    ? { textAlign: block.props.textAlignment }
    : {}),
});

const placeholder = (
  block: BlockNoteBlock,
  reason: string,
): OpenEditorBlock => ({
  type: "baseblocksMigrationPlaceholder",
  attrs: {
    sourceBlockId: block.id,
    sourceType: `richtext:${block.type}`,
    reason,
  },
});

function convertTable(
  block: BlockNoteBlock,
  warnings: ConversionWarning[],
): OpenEditorBlock | null {
  if (!isRecord(block.content) || !Array.isArray(block.content.rows))
    return null;
  const headerRows =
    typeof block.content.headerRows === "number" ? block.content.headerRows : 0;
  const headerCols =
    typeof block.content.headerCols === "number" ? block.content.headerCols : 0;

  return {
    type: "table",
    content: block.content.rows.map((rowValue, rowIndex) => {
      const cells: unknown[] =
        isRecord(rowValue) && Array.isArray(rowValue.cells)
          ? rowValue.cells
          : [];
      return {
        type: "tableRow",
        content: cells.map((cellValue, columnIndex) => {
          const cell =
            isRecord(cellValue) && cellValue.type === "tableCell"
              ? cellValue
              : { content: cellValue, props: {} };
          const props = isRecord(cell.props) ? cell.props : {};
          const isHeader = rowIndex < headerRows || columnIndex < headerCols;
          return {
            type: isHeader ? "tableHeader" : "tableCell",
            attrs: {
              colspan: typeof props.colspan === "number" ? props.colspan : 1,
              rowspan: typeof props.rowspan === "number" ? props.rowspan : 1,
            },
            content: [
              {
                type: "paragraph",
                content: inlineContent(cell.content, warnings, block),
              },
            ],
          };
        }),
      };
    }),
  };
}

function convertChildren(
  block: BlockNoteBlock,
  warnings: ConversionWarning[],
): { nodes: OpenEditorBlock[]; placeholders: number } {
  if (block.children.length === 0) return { nodes: [], placeholders: 0 };
  warnings.push({
    code: "flattened-rich-text-children",
    severity: "info",
    blockId: block.id,
    message: `Nested children under BlockNote ${block.type} are preserved in order.`,
  });
  return convertBlocks(block.children, warnings);
}

function listItem(
  block: BlockNoteBlock,
  warnings: ConversionWarning[],
): { node: ProseMirrorNode; placeholders: number } {
  const children = convertBlocks(block.children, warnings);
  return {
    node: {
      type: block.type === "checkListItem" ? "taskItem" : "listItem",
      ...(block.type === "checkListItem"
        ? { attrs: { checked: block.props.checked === true } }
        : {}),
      content: [
        {
          type: "paragraph",
          content: inlineContent(block.content, warnings, block),
        },
        ...children.nodes,
      ],
    },
    placeholders: children.placeholders,
  };
}

function convertBlocks(
  blocks: BlockNoteBlock[],
  warnings: ConversionWarning[],
): { nodes: OpenEditorBlock[]; placeholders: number } {
  const nodes: OpenEditorBlock[] = [];
  let placeholders = 0;

  for (let index = 0; index < blocks.length; index += 1) {
    const block = blocks[index]!;

    if (
      ["bulletListItem", "numberedListItem", "checkListItem"].includes(
        block.type,
      )
    ) {
      const listType = block.type;
      const items: ProseMirrorNode[] = [];
      let cursor = index;
      while (cursor < blocks.length && blocks[cursor]?.type === listType) {
        const item = listItem(blocks[cursor]!, warnings);
        items.push(item.node);
        placeholders += item.placeholders;
        cursor += 1;
      }
      nodes.push({
        type:
          listType === "bulletListItem"
            ? "bulletList"
            : listType === "numberedListItem"
              ? "orderedList"
              : "taskList",
        ...(listType === "numberedListItem" &&
        typeof block.props.start === "number"
          ? { attrs: { start: block.props.start } }
          : {}),
        content: items,
      });
      index = cursor - 1;
      continue;
    }

    const childResult = convertChildren(block, warnings);
    switch (block.type) {
      case "paragraph":
        nodes.push({
          type: "paragraph",
          attrs: textAttrs(block),
          content: inlineContent(block.content, warnings, block),
        });
        break;
      case "heading":
        nodes.push({
          type: "heading",
          attrs: textAttrs(block, {
            level:
              typeof block.props.level === "number"
                ? Math.min(Math.max(block.props.level, 1), 6)
                : 1,
          }),
          content: inlineContent(block.content, warnings, block),
        });
        break;
      case "quote":
        nodes.push({
          type: "blockquote",
          content: [
            {
              type: "paragraph",
              content: inlineContent(block.content, warnings, block),
            },
          ],
        });
        break;
      case "codeBlock": {
        const text = textFromInline(block.content);
        nodes.push({
          type: "codeBlock",
          attrs: {
            language:
              typeof block.props.language === "string"
                ? block.props.language
                : "plaintext",
          },
          content: text ? [createTextNode(text)] : [],
        });
        break;
      }
      case "divider":
        nodes.push({ type: "horizontalRule" });
        break;
      case "image": {
        const url = typeof block.props.url === "string" ? block.props.url : "";
        const caption =
          typeof block.props.caption === "string" ? block.props.caption : "";
        nodes.push({
          type: "image",
          attrs: {
            src: url,
            alt:
              typeof block.props.name === "string" && block.props.name
                ? block.props.name
                : caption,
            width:
              typeof block.props.previewWidth === "number"
                ? block.props.previewWidth
                : null,
          },
        });
        if (caption) {
          nodes.push({
            type: "paragraph",
            content: [createTextNode(caption, [mark("italic")])],
          });
        }
        break;
      }
      case "table": {
        const table = convertTable(block, warnings);
        if (table) nodes.push(table);
        else {
          const reason =
            "BlockNote table content is malformed and could not be converted.";
          nodes.push(placeholder(block, reason));
          placeholders += 1;
          warnings.push({
            code: "unsupported-rich-text-block",
            severity: "warning",
            blockId: block.id,
            message: reason,
          });
        }
        break;
      }
      default: {
        const reason = `BlockNote ${block.type} is not supported by Open Editor yet.`;
        nodes.push(placeholder(block, reason));
        placeholders += 1;
        warnings.push({
          code: "unsupported-rich-text-block",
          severity: "warning",
          blockId: block.id,
          message: reason,
        });
      }
    }
    nodes.push(...childResult.nodes);
    placeholders += childResult.placeholders;
  }

  return { nodes, placeholders };
}

export function convertBlockNoteDocument(
  document: unknown,
): BlockNoteConversion {
  const warnings: ConversionWarning[] = [];
  if (!Array.isArray(document)) {
    return {
      nodes: [],
      warnings: [
        {
          code: "unsupported-rich-text-block",
          severity: "warning",
          message:
            "Legacy Rich Text content is not a BlockNote document array.",
        },
      ],
      placeholderCount: 0,
    };
  }
  const blocks = document
    .map((block, index) => readBlock(block, index))
    .filter((block): block is BlockNoteBlock => block !== null);
  const result = convertBlocks(blocks, warnings);
  return {
    nodes: result.nodes,
    warnings,
    placeholderCount: result.placeholders,
  };
}
