import { describe, expect, test } from "bun:test";
import { baseBlocksCustomBlocks } from "@baseblocks/custom-blocks";
import { baseBlocksCoreBlocks } from "@baseblocks/openeditor-contracts/core-blocks";
import {
  conformOpenEditorCustomBlock,
  createOpenEditorCustomBlockNode,
  createOpenEditorCustomBlockRegistry,
} from "@openeditor/custom-block";

describe("complete BaseBlocks block catalog", () => {
  test("creates the six conforming blocks through one generic node", () => {
    const blocks = [...baseBlocksCustomBlocks, ...baseBlocksCoreBlocks];
    const registry = createOpenEditorCustomBlockRegistry(blocks);
    expect(blocks).toHaveLength(6);
    for (const block of blocks) {
      expect(conformOpenEditorCustomBlock(block)).toEqual([]);
      const node = createOpenEditorCustomBlockNode(
        registry,
        block.id,
        undefined,
        {
          instanceId: `instance-${block.id}`,
        },
      );
      expect(node.type).toBe("customBlock");
      expect(registry.resolve(node).status).toBe("ready");
    }
    expect(baseBlocksCustomBlocks.map(({ id }) => id)).toEqual([
      "baseblocks.directory",
      "baseblocks.decision-tree",
      "baseblocks.quick-links",
    ]);
  });
});
