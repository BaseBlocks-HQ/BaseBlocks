"use client";

import { baseBlocksCustomBlockViewers } from "@baseblocks/custom-blocks/viewer";
import type {
  OpenEditorAttachmentRuntime,
  OpenEditorDocument,
  OpenEditorImageRuntime,
  OpenEditorPageRuntime,
} from "@openeditor/core";
import { OpenEditorViewer } from "@openeditor/react/viewer";
import { libraryViewer } from "./extensions/library";
import { searchViewer } from "./extensions/search";
import { baseBlocksCustomBlockRegistry } from "./custom-block-registry";
import { createBaseBlocksCustomBlockHost } from "./custom-block-host";

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
    viewers: [...baseBlocksCustomBlockViewers, searchViewer, libraryViewer],
    host: {
      ...createBaseBlocksCustomBlockHost(authorizedAssetIds),
      fields: { document: DocumentViewer },
    },
  };
};
