import type {
  DecisionTreeContentBlock,
  DecisionTreeNode,
} from "@baseblocks/domain/elements";

export function createDecisionTreeNodeId() {
  return `node-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

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

export function insertParentForNode(
  nodes: DecisionTreeNode[],
  nodeId: string,
  parentName = "New parent",
): { nodes: DecisionTreeNode[]; parentId: string | null } {
  const targetNode = nodes.find((node) => node.id === nodeId);
  if (!targetNode) {
    return { nodes, parentId: null };
  }

  const parentId = createDecisionTreeNodeId();
  const newParentNode: DecisionTreeNode = {
    id: parentId,
    parentId: targetNode.parentId,
    name: parentName,
    order: targetNode.order,
    document: [],
  };

  const updatedNodes = nodes.map((node) =>
    node.id === nodeId ? { ...node, parentId, order: 0 } : node,
  );

  return {
    nodes: [...updatedNodes, newParentNode],
    parentId,
  };
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
          props: { language: block.content?.language || "plaintext" },
          content: block.content?.text || "",
        });
        break;
      // divider: skip (no BlockNote equivalent)
    }
  }

  return doc;
}
