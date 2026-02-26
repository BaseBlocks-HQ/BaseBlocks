import type {
  DecisionTreeContentBlock,
  DecisionTreeNode,
} from "@baseblocks/types/elements";

/**
 * Gets the BlockNote document for a node, converting from legacy contentBlocks if needed.
 */
export function getNodeDocument(node: DecisionTreeNode): unknown[] {
  if (node.document && node.document.length > 0) return node.document;
  if (!node.contentBlocks || node.contentBlocks.length === 0) return [];
  return contentBlocksToDocument(node.contentBlocks);
}

/**
 * Whether a node has any renderable content (document or legacy contentBlocks).
 */
export function nodeHasContent(node: DecisionTreeNode): boolean {
  return (
    (node.document !== undefined && node.document.length > 0) ||
    (node.contentBlocks !== undefined && node.contentBlocks.length > 0)
  );
}

/**
 * Converts legacy DecisionTreeContentBlock[] to BlockNote PartialBlock[] format.
 * Used for backward-compat rendering of pre-migration data.
 */
function contentBlocksToDocument(
  blocks: DecisionTreeContentBlock[],
): unknown[] {
  const sorted = [...blocks].sort((a, b) => a.order - b.order);
  const doc: unknown[] = [];

  for (const block of sorted) {
    switch (block.type) {
      case "heading":
        doc.push({
          type: "heading",
          content: block.content?.text || "",
          props: { level: Math.min(block.content?.level || 2, 3) },
        });
        break;
      case "paragraph": {
        const text: string = block.content?.text || "";
        for (const line of text.split("\n")) {
          doc.push({ type: "paragraph", content: line });
        }
        break;
      }
      case "callout":
        doc.push({
          type: "paragraph",
          content: block.content?.text || "",
        });
        break;
      case "code":
        doc.push({
          type: "codeBlock",
          props: { language: block.content?.language || "typescript" },
          content: block.content?.text || "",
        });
        break;
      // divider: skip (no BlockNote equivalent)
    }
  }

  return doc;
}
