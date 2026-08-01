"use client";

import { DirectoryEditor } from "@/features/openeditor/renderers/directory-editor";
import {
  createDirectoryContent,
  directoryToHtml,
  directoryToText,
  readDirectory,
} from "@/features/openeditor/renderers/directory-model";
import { DirectoryViewer } from "@/features/openeditor/renderers/directory";
import {
  baseBlocksSlashMenuOrder,
  createOpenEditorIcon,
} from "@/features/openeditor/slash-menu";
import { Table01Icon } from "@hugeicons/core-free-icons";
import {
  defineOpenEditorReactNode,
  NodeViewWrapper,
  type OpenEditorNodeViewProps,
} from "@openeditor/react";

const DirectoryMenuIcon = createOpenEditorIcon(Table01Icon);

function DirectoryNode({
  editor,
  node,
  updateAttributes,
}: OpenEditorNodeViewProps) {
  const value = readDirectory(node.attrs.directory);

  return (
    <NodeViewWrapper contentEditable={false}>
      {editor.isEditable ? (
        <DirectoryEditor
          onChange={(directory) => updateAttributes({ directory })}
          value={value}
        />
      ) : (
        <DirectoryViewer value={value} />
      )}
    </NodeViewWrapper>
  );
}

export const directoryExtension = defineOpenEditorReactNode({
  block: {
    name: "baseblocks.directory",
    nodeType: "baseblocksDirectory",
    label: "Directory",
    group: "embed",
    defaultNode: () => ({
      type: "baseblocksDirectory",
      attrs: { directory: createDirectoryContent() },
    }),
    support: { web: "supported", native: "unsupported" },
  },
  node: {
    group: "block",
    atom: true,
    draggable: true,
    addAttributes: () => ({
      directory: { default: createDirectoryContent() },
    }),
    parseHTML: () => [{ tag: "section[data-baseblocks-directory]" }],
    renderHTML: ({ HTMLAttributes }) => [
      "section",
      { ...HTMLAttributes, "data-baseblocks-directory": "" },
    ],
  },
  component: DirectoryNode,
  insertMenu: {
    icon: DirectoryMenuIcon,
    keywords: ["table", "data", "list", "grid"],
    order: baseBlocksSlashMenuOrder.directory,
  },
  viewer: ({ node }) => (
    <DirectoryViewer value={readDirectory(node.attrs?.directory)} />
  ),
  exporters: {
    html: {
      baseblocksDirectory: ({ node, escapeHtml }) =>
        directoryToHtml(readDirectory(node.attrs?.directory), escapeHtml),
    },
    text: {
      baseblocksDirectory: ({ node }) =>
        directoryToText(readDirectory(node.attrs?.directory)),
    },
  },
});
