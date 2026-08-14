import { describe, expect, test } from "bun:test";
import { resolveOpenEditorBlockMenu } from "@openeditor/react";
import { baseBlocksCustomBlockMenuExtension } from "./custom-block-menu";

const configureLabels = (blockId: string) => {
  const ref = { id: "block-1", nodeType: "customBlock" };
  const block = {
    ref,
    node: {
      type: "customBlock",
      attrs: { "openeditor-id": ref.id, blockId, version: 1, data: {} },
    },
    attributes: { blockId, version: 1, data: {} },
  };
  const target = {
    ref,
    read: () => block,
    getSnapshot: () => block,
    subscribe: () => () => {},
    commands: {
      updateAttributes: () => true,
      select: () => true,
      copy: async () => true,
      duplicate: () => true,
      delete: () => true,
      move: () => true,
      canMove: () => true,
    },
  };

  return resolveOpenEditorBlockMenu({
    target,
    extensions: [baseBlocksCustomBlockMenuExtension],
  })
    .sections.flatMap(({ items }) => items)
    .filter(({ section }) => section === "configure")
    .map(({ label }) => label);
};

describe("BaseBlocks custom block menu", () => {
  test.each([
    ["baseblocks.directory", ["Configure"]],
    ["baseblocks.library", ["Configure"]],
    ["baseblocks.search", ["Configure"]],
    ["baseblocks.decision-tree", []],
    ["baseblocks.quick-links", []],
  ])("shows the intended configuration for %s", (blockId, expected) => {
    expect(configureLabels(blockId)).toEqual(expected);
  });
});
