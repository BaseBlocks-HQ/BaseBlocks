import { baseBlocksCustomBlocks } from "@baseblocks/custom-blocks";
import { createOpenEditorCustomBlockRegistry } from "@openeditor/core";
import { baseBlocksProductBlocks } from "./core-blocks";

/** The one authoritative block set for every BaseBlocks runtime. */
export const baseBlocksBlockRegistry = createOpenEditorCustomBlockRegistry([
  ...baseBlocksCustomBlocks,
  ...baseBlocksProductBlocks,
]);
