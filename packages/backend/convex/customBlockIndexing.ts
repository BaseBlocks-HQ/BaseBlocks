import { baseBlocksCustomBlocks } from "@baseblocks/custom-blocks";
import { baseBlocksCoreBlocks } from "@baseblocks/openeditor-contracts/core-blocks";
import { createOpenEditorCustomBlockRegistry } from "@openeditor/custom-block";
import type { OpenEditorDocument, ProseMirrorNode } from "@openeditor/core";

const registry = createOpenEditorCustomBlockRegistry([
  ...baseBlocksCustomBlocks,
  ...baseBlocksCoreBlocks,
]);

/** Trusted first-party semantic indexing composition. */
export function extractOpenEditorText(document: OpenEditorDocument): string {
  const parts: string[] = [];
  const visit = (node: ProseMirrorNode): void => {
    if (node.type === "customBlock") {
      const text = registry.toText(node);
      if (text) parts.push(text);
      return;
    }
    if (typeof node.text === "string") parts.push(node.text);
    const attrs = node.attrs;
    if (attrs)
      for (const key of ["name", "title", "label", "description", "code"])
        if (typeof attrs[key] === "string") parts.push(attrs[key] as string);
    for (const child of node.content ?? []) visit(child);
  };
  for (const node of document.content) visit(node);
  return parts.join(" ").replace(/\s+/g, " ").trim();
}
