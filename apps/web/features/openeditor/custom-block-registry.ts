import { baseBlocksCustomBlocks } from "@baseblocks/custom-blocks";
import { baseBlocksCoreBlocks } from "@baseblocks/openeditor-contracts/core-blocks";
import { createOpenEditorCustomBlockRegistry } from "@openeditor/custom-block";

export const baseBlocksCustomBlockRegistry =
  createOpenEditorCustomBlockRegistry([
    ...baseBlocksCustomBlocks,
    ...baseBlocksCoreBlocks,
  ]);

export const baseBlocksInstallableCustomBlockIds = new Set(
  baseBlocksCustomBlocks.map(({ id }) => id),
);
