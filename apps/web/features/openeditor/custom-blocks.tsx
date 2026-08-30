"use client";

import {
  FolderLibraryIcon,
  GitForkIcon,
  LayoutTable01Icon,
  LinkSquare02Icon,
  Search01Icon,
} from "@hugeicons/core-free-icons";
import { OpenEditorContent, useOpenEditorController } from "@openeditor/react";
import { baseBlocksCustomBlockEditors } from "@baseblocks/custom-blocks/editor";
import { extractOpenEditorCustomBlockAssetReferences } from "@openeditor/core";
import type {
  OpenEditorAttachmentRuntime,
  OpenEditorDocument,
  OpenEditorImageRuntime,
  OpenEditorPageRuntime,
} from "@openeditor/core";
import { useRef, type ComponentProps } from "react";
import { libraryEditor } from "./extensions/library";
import { searchEditor } from "./extensions/search";

import { baseBlocksCustomBlockRegistry } from "./custom-block-registry";
import { createBaseBlocksCustomBlockHost } from "./custom-block-host";
import { createOpenEditorIcon } from "./slash-menu";
import {
  baseBlocksBlockMenuExtensions,
  baseBlocksCustomBlockMenuExtension,
} from "./custom-block-menu";
import { useOpenEditorDocumentSync } from "./use-open-editor-document-sync";
export { baseBlocksCustomBlockRegistry } from "./custom-block-registry";

const customBlockSlashMenuIcons = {
  "baseblocks.decision-tree": createOpenEditorIcon(GitForkIcon),
  "baseblocks.directory": createOpenEditorIcon(LayoutTable01Icon),
  "baseblocks.library": createOpenEditorIcon(FolderLibraryIcon),
  "baseblocks.quick-links": createOpenEditorIcon(LinkSquare02Icon),
  "baseblocks.search": createOpenEditorIcon(Search01Icon),
} as const;

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

export class BaseBlocksCustomBlockAssetAuthorization {
  private documentAssetIds = new Set<string>();
  private pendingAssetIds = new Set<string>();

  constructor(document: OpenEditorDocument) {
    this.updateDocument(document);
  }

  updateDocument(document: OpenEditorDocument) {
    this.documentAssetIds = extractBaseBlocksCustomBlockAssetIds(document);
    for (const id of this.documentAssetIds) this.pendingAssetIds.delete(id);
  }

  discard(id: string) {
    return this.pendingAssetIds.delete(id);
  }

  authorize<T extends { id: string }>(asset: T | null) {
    if (asset) this.pendingAssetIds.add(asset.id);
    return asset;
  }

  has(id: string) {
    return this.documentAssetIds.has(id) || this.pendingAssetIds.has(id);
  }
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
  const locallyEmittedDocumentRef = useRef<OpenEditorDocument | undefined>(
    undefined,
  );
  const handleChange = (nextDocument: OpenEditorDocument) => {
    locallyEmittedDocumentRef.current = nextDocument;
    onChange(nextDocument);
  };
  const controller = useOpenEditorController({
    initialDocument: value,
    editable: true,
    blockMenuExtensions: baseBlocksBlockMenuExtensions,
    customBlocks,
    attachmentRuntime: runtimes.attachmentRuntime,
    imageRuntime: runtimes.imageRuntime,
    pageRuntime: runtimes.pageRuntime,
    onChange: handleChange,
  });
  useOpenEditorDocumentSync({
    controller,
    document: value,
    locallyEmittedDocumentRef,
  });
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
  discardAsset?: (id: string) => Promise<void>,
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
        discardAsset,
      )}
      runtimes={runtimes}
    />
  );
  return {
    registry: baseBlocksCustomBlockRegistry,
    editors: [...baseBlocksCustomBlockEditors, searchEditor, libraryEditor],
    icons: customBlockSlashMenuIcons,
    blockMenuExtensions: [baseBlocksCustomBlockMenuExtension],
    host: {
      ...createBaseBlocksCustomBlockHost(
        authorizedAssetIds,
        pickAsset,
        discardAsset,
      ),
      fields: { document: DocumentEditor },
    },
  };
};

export type BaseBlocksNestedRuntimes = {
  attachmentRuntime?: OpenEditorAttachmentRuntime<File>;
  imageRuntime?: OpenEditorImageRuntime<File>;
  pageRuntime?: OpenEditorPageRuntime;
};
