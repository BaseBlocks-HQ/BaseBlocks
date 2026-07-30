import {
  createDocument,
  type OpenEditorDocument,
  type ProseMirrorMark,
  type ProseMirrorNode,
} from "@openeditor/core";

export interface NotionRichText {
  plain_text?: string;
  href?: string | null;
  annotations?: {
    bold?: boolean;
    italic?: boolean;
    strikethrough?: boolean;
    underline?: boolean;
    code?: boolean;
  };
}

export interface NotionBlock {
  id: string;
  type: string;
  has_children?: boolean;
  children?: NotionBlock[];
  [key: string]: unknown;
}

type NotionBlockData = {
  rich_text?: NotionRichText[];
  caption?: NotionRichText[];
  checked?: boolean;
  language?: string;
  url?: string;
  external?: { url?: string };
  file?: { url?: string };
  emoji?: string;
  icon?: { type?: string; emoji?: string };
};

function blockData(block: NotionBlock): NotionBlockData {
  const value = block[block.type];
  return value && typeof value === "object" ? (value as NotionBlockData) : {};
}

function richTextNodes(items: NotionRichText[] = []): ProseMirrorNode[] {
  return items.flatMap((item) => {
    const text = item.plain_text ?? "";
    if (!text) return [];
    const marks: ProseMirrorMark[] = [];
    if (item.annotations?.bold) marks.push({ type: "bold" });
    if (item.annotations?.italic) marks.push({ type: "italic" });
    if (item.annotations?.strikethrough) marks.push({ type: "strike" });
    if (item.annotations?.underline) marks.push({ type: "underline" });
    if (item.annotations?.code) marks.push({ type: "code" });
    if (item.href) marks.push({ type: "link", attrs: { href: item.href } });
    return [{ type: "text", text, ...(marks.length ? { marks } : {}) }];
  });
}

function paragraph(
  richText: NotionRichText[] = [],
  attrs?: Record<string, unknown>,
): ProseMirrorNode {
  const content = richTextNodes(richText);
  return {
    type: "paragraph",
    ...(attrs ? { attrs } : {}),
    ...(content.length ? { content } : {}),
  };
}

function childBlocks(block: NotionBlock): ProseMirrorNode[] {
  return convertBlocks(block.children ?? []);
}

function textBlock(
  type: string,
  block: NotionBlock,
  attrs?: Record<string, unknown>,
): ProseMirrorNode {
  const data = blockData(block);
  const content = richTextNodes(data.rich_text);
  return {
    type,
    ...(attrs ? { attrs } : {}),
    ...(content.length ? { content } : {}),
  };
}

function listItem(block: NotionBlock): ProseMirrorNode {
  const data = blockData(block);
  return {
    type: "listItem",
    content: [paragraph(data.rich_text), ...childBlocks(block)],
  };
}

function taskItem(block: NotionBlock): ProseMirrorNode {
  const data = blockData(block);
  return {
    type: "taskItem",
    attrs: { checked: Boolean(data.checked) },
    content: [paragraph(data.rich_text), ...childBlocks(block)],
  };
}

function mediaUrl(data: NotionBlockData): string | undefined {
  return data.external?.url ?? data.file?.url ?? data.url;
}

function fallbackBlock(block: NotionBlock): ProseMirrorNode[] {
  const data = blockData(block);
  const label = richTextNodes(data.rich_text);
  if (label.length) return [{ type: "paragraph", content: label }];
  return [
    paragraph([
      {
        plain_text: `[Unsupported Notion block: ${block.type.replaceAll("_", " ")}]`,
      },
    ]),
  ];
}

function convertSingleBlock(block: NotionBlock): ProseMirrorNode[] {
  const data = blockData(block);
  switch (block.type) {
    case "paragraph":
      return [paragraph(data.rich_text), ...childBlocks(block)];
    case "heading_1":
      return [textBlock("heading", block, { level: 1 }), ...childBlocks(block)];
    case "heading_2":
      return [textBlock("heading", block, { level: 2 }), ...childBlocks(block)];
    case "heading_3":
    case "heading_4":
      return [textBlock("heading", block, { level: 3 }), ...childBlocks(block)];
    case "quote":
      return [
        {
          type: "blockquote",
          content: [paragraph(data.rich_text), ...childBlocks(block)],
        },
      ];
    case "callout":
      return [
        {
          type: "callout",
          attrs: {
            emoji:
              data.icon?.type === "emoji"
                ? (data.icon.emoji ?? "💡")
                : (data.emoji ?? "💡"),
          },
          content: [paragraph(data.rich_text), ...childBlocks(block)],
        },
      ];
    case "toggle":
      return [
        {
          type: "toggleList",
          content: [
            {
              type: "toggleItem",
              content: [paragraph(data.rich_text), ...childBlocks(block)],
            },
          ],
        },
      ];
    case "code":
      return [
        {
          type: "codeBlock",
          attrs: { language: data.language ?? "plain" },
          content: richTextNodes(data.rich_text),
        },
      ];
    case "divider":
      return [{ type: "horizontalRule" }];
    case "bookmark":
    case "embed":
    case "link_preview": {
      const url = mediaUrl(data);
      return url
        ? [
            paragraph([
              {
                plain_text: url,
                href: url,
              },
            ]),
          ]
        : fallbackBlock(block);
    }
    case "image": {
      const alt = (data.caption ?? [])
        .map((item) => item.plain_text ?? "")
        .join("");
      return data.external?.url
        ? [
            {
              type: "image",
              attrs: {
                imageId: null,
                src: data.external.url,
                alt,
                width: null,
                height: null,
              },
            },
          ]
        : [
            paragraph([
              {
                plain_text: alt
                  ? `[Image from Notion: ${alt}]`
                  : "[Image from Notion]",
              },
            ]),
          ];
    }
    case "child_page":
    case "child_database":
      return [
        paragraph([
          {
            plain_text:
              block.type === "child_page"
                ? "Open child page in Notion"
                : "Open database in Notion",
          },
        ]),
      ];
    case "column_list":
    case "column":
    case "synced_block":
    case "template":
      return childBlocks(block);
    default:
      return fallbackBlock(block);
  }
}

export function convertBlocks(blocks: NotionBlock[]): ProseMirrorNode[] {
  const result: ProseMirrorNode[] = [];
  let index = 0;
  while (index < blocks.length) {
    const block = blocks[index];
    if (!block) break;
    if (
      block.type === "bulleted_list_item" ||
      block.type === "numbered_list_item" ||
      block.type === "to_do"
    ) {
      const notionType = block.type;
      const items: ProseMirrorNode[] = [];
      while (blocks[index]?.type === notionType) {
        const item = blocks[index];
        if (!item) break;
        items.push(notionType === "to_do" ? taskItem(item) : listItem(item));
        index += 1;
      }
      result.push({
        type:
          notionType === "bulleted_list_item"
            ? "bulletList"
            : notionType === "numbered_list_item"
              ? "orderedList"
              : "taskList",
        content: items,
      });
      continue;
    }
    result.push(...convertSingleBlock(block));
    index += 1;
  }
  return result;
}

export function notionBlocksToOpenEditor(
  blocks: NotionBlock[],
  sourceId: string,
): OpenEditorDocument {
  const content = convertBlocks(blocks);
  return createDocument(content.length ? content : [{ type: "paragraph" }], {
    source: "notion",
    custom: { sourceId },
  });
}
