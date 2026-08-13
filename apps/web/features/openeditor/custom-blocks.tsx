"use client";

import { OpenEditorContent, useOpenEditorController } from "@openeditor/react";
import { baseBlocksCustomBlockEditors } from "@baseblocks/custom-blocks/editor";
import { extractOpenEditorCustomBlockAssetReferences } from "@openeditor/custom-block";
import type {
  OpenEditorAttachmentRuntime,
  OpenEditorDocument,
  OpenEditorImageRuntime,
  OpenEditorPageRuntime,
} from "@openeditor/core";
import { useEffect, useRef, type ComponentProps } from "react";
import { libraryEditor } from "./extensions/library";
import { searchEditor } from "./extensions/search";

import { baseBlocksCustomBlockRegistry } from "./custom-block-registry";
import { createBaseBlocksCustomBlockHost } from "./custom-block-host";
export { baseBlocksCustomBlockRegistry } from "./custom-block-registry";

export function extractBaseBlocksCustomBlockAssetIds(
  document: OpenEditorDocument,
) {
  const ids = new Set<string>();
  const visited = new WeakSet<object>();
  const visit = (value: unknown): void => {
    if (Array.isArray(value)) {
      for (const item of value) visit(item);
      return;
    }
    if (!value || typeof value !== "object") return;
    if (visited.has(value)) return;
    visited.add(value);
    const node = value as {
      type?: unknown;
      attrs?: unknown;
    };
    if (node.type === "customBlock") {
      for (const reference of extractOpenEditorCustomBlockAssetReferences(
        node.attrs,
        baseBlocksCustomBlockRegistry,
      ))
        ids.add(reference.id);
    }
    for (const child of Object.values(value)) visit(child);
  };
  visit(document);
  return ids;
}

export function authorizeBaseBlocksCustomBlockAsset<T extends { id: string }>(
  authorizedAssetIds: Set<string>,
  asset: T | null,
) {
  if (asset) authorizedAssetIds.add(asset.id);
  return asset;
}

function DocumentEditorSurface({
  value,
  onChange,
  ariaLabel,
  customBlocks,
  runtimes,
}: {
  value: OpenEditorDocument;
  onChange: (value: OpenEditorDocument) => void;
  ariaLabel: string;
  customBlocks: ReturnType<
    typeof createBaseBlocksCustomBlockEditorConfiguration
  >;
  runtimes: BaseBlocksNestedRuntimes;
}) {
  const emitted = useRef<OpenEditorDocument | undefined>(undefined);
  const controller = useOpenEditorController({
    initialDocument: value,
    editable: true,
    customBlocks,
    attachmentRuntime: runtimes.attachmentRuntime,
    imageRuntime: runtimes.imageRuntime,
    pageRuntime: runtimes.pageRuntime,
    onChange: (document) => {
      emitted.current = document;
      onChange(document);
    },
  });
  useEffect(() => {
    if (!controller.ready || value === emitted.current) return;
    controller.setContent(value, { emitChange: false });
  }, [controller, controller.ready, value]);
  return (
    <section aria-label={ariaLabel}>
      <OpenEditorContent controller={controller} />
    </section>
  );
}

export const createBaseBlocksCustomBlockEditorConfiguration = (
  authorizedAssetIds: Pick<ReadonlySet<string>, "has">,
  pickAsset?: () => Promise<{ id: string; kind: "raster"; alt: string } | null>,
  runtimes: BaseBlocksNestedRuntimes = {},
) => {
  const DocumentEditor = (
    props: Omit<
      ComponentProps<typeof DocumentEditorSurface>,
      "customBlocks" | "runtimes"
    >,
  ) => (
    <DocumentEditorSurface
      {...props}
      customBlocks={createBaseBlocksCustomBlockEditorConfiguration(
        authorizedAssetIds,
        pickAsset,
        runtimes,
      )}
      runtimes={runtimes}
    />
  );
  return {
    registry: baseBlocksCustomBlockRegistry,
    editors: [...baseBlocksCustomBlockEditors, searchEditor, libraryEditor],
    host: {
      ...createBaseBlocksCustomBlockHost(authorizedAssetIds, pickAsset),
      fields: { document: DocumentEditor },
    },
  };
};

export type BaseBlocksNestedRuntimes = {
  attachmentRuntime?: OpenEditorAttachmentRuntime<File>;
  imageRuntime?: OpenEditorImageRuntime<File>;
  pageRuntime?: OpenEditorPageRuntime;
};
