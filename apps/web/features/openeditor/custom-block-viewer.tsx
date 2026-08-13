"use client";

import { baseBlocksCustomBlockViewers } from "@baseblocks/custom-blocks/viewer";
import {
  libraryBlock,
  pageTabsBlock,
  searchBlock,
} from "@baseblocks/openeditor-contracts/core-blocks";
import { defineOpenEditorCustomBlockViewer } from "@openeditor/custom-block/viewer";
import type {
  OpenEditorAttachmentRuntime,
  OpenEditorDocument,
  OpenEditorImageRuntime,
  OpenEditorPageRuntime,
} from "@openeditor/core";
import { OpenEditorViewer } from "@openeditor/react/viewer";
import { PublicLibraryViewer, readLibrary } from "./renderers/library";
import { readSearch, SearchViewer } from "./renderers/search";
import { PageTabsViewerSurface } from "./page-tabs-viewer";
import { baseBlocksCustomBlockRegistry } from "./custom-block-registry";
import { createBaseBlocksCustomBlockHost } from "./custom-block-host";

const coreViewers = [
  defineOpenEditorCustomBlockViewer({
    block: searchBlock,
    render: ({ data }) => <SearchViewer value={readSearch(data)} />,
  }),
  defineOpenEditorCustomBlockViewer({
    block: libraryBlock,
    render: ({ data }) => <PublicLibraryViewer value={readLibrary(data)} />,
  }),
  defineOpenEditorCustomBlockViewer({
    block: pageTabsBlock,
    render: PageTabsViewerSurface,
  }),
] as const;

type NestedRuntimes = {
  attachmentRuntime?: OpenEditorAttachmentRuntime<File>;
  imageRuntime?: OpenEditorImageRuntime<File>;
  pageRuntime?: OpenEditorPageRuntime;
};
export const createBaseBlocksCustomBlockViewerConfiguration = (
  authorizedAssetIds: ReadonlySet<string>,
  runtimes: NestedRuntimes = {},
) => {
  const DocumentViewer = ({
    value,
    ariaLabel,
  }: {
    value: OpenEditorDocument;
    ariaLabel: string;
  }) => (
    <section aria-label={ariaLabel}>
      <OpenEditorViewer
        attachmentRuntime={runtimes.attachmentRuntime}
        customBlocks={createBaseBlocksCustomBlockViewerConfiguration(
          authorizedAssetIds,
          runtimes,
        )}
        document={value}
        imageRuntime={runtimes.imageRuntime}
        pageRuntime={runtimes.pageRuntime}
      />
    </section>
  );
  return {
    registry: baseBlocksCustomBlockRegistry,
    viewers: [...baseBlocksCustomBlockViewers, ...coreViewers],
    host: {
      ...createBaseBlocksCustomBlockHost(authorizedAssetIds),
      fields: { document: DocumentViewer },
    },
  };
};
