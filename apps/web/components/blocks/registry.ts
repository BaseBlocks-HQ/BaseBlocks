/**
 * Block registry pattern - extensible block system
 * Add new block types by creating component + calling registerBlock()
 */
import type { ComponentType } from "react";
import type { BlockType } from "@/types";
import type {
  BlockRegistryEntry,
  BlockEditorBaseProps,
  BlockRendererBaseProps,
} from "./types";

const registry = new Map<BlockType, BlockRegistryEntry>();

/**
 * Register a block type with its components
 */
export function registerBlock(entry: BlockRegistryEntry): void {
  registry.set(entry.type, entry);
}

/**
 * Get the editor component for a block type
 */
export function getBlockEditor(
  type: BlockType,
): ComponentType<BlockEditorBaseProps> | undefined {
  return registry.get(type)?.editor;
}

/**
 * Get the renderer component for a block type
 */
export function getBlockRenderer(
  type: BlockType,
): ComponentType<BlockRendererBaseProps> | undefined {
  return registry.get(type)?.renderer;
}

/**
 * Get the label for a block type
 */
export function getBlockLabel(type: BlockType): string {
  return registry.get(type)?.label || type;
}

/**
 * Check if a block type is registered
 */
export function isBlockRegistered(type: BlockType): boolean {
  return registry.has(type);
}

/**
 * Get all registered block types
 */
export function getRegisteredBlockTypes(): BlockType[] {
  return Array.from(registry.keys());
}

/**
 * Get all registry entries (for building UI menus)
 */
export function getAllBlockEntries(): BlockRegistryEntry[] {
  return Array.from(registry.values());
}
