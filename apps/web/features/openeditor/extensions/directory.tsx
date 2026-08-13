"use client";

import {
  DirectoryEditor,
  DirectorySettings,
} from "@/features/openeditor/renderers/directory-editor";
import {
  directoryToHtml,
  directoryToText,
  readDirectory,
} from "@/features/openeditor/renderers/directory-model";
import { DirectoryViewer } from "@/features/openeditor/renderers/directory";
import {
  baseBlocksSlashMenuOrder,
  createOpenEditorIcon,
} from "@/features/openeditor/slash-menu";
import { CogIcon, Table01Icon } from "@hugeicons/core-free-icons";
import { directoryDefinition } from "@baseblocks/openeditor-contracts";
import {
  defineOpenEditorReactNode,
  NodeViewWrapper,
  type OpenEditorBlockPanelProps,
  type OpenEditorNodeViewProps,
  useOpenEditorBlockTarget,
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

function DirectorySettingsPanel({ target }: OpenEditorBlockPanelProps) {
  const block = useOpenEditorBlockTarget(target);
  if (!block) return null;
  const value = readDirectory(block.attributes.directory);
  const updatePageSize = (directoryId: string, pageSize: number | null) => {
    target.commands.updateAttributes({
      directory: {
        ...value,
        directories: value.directories.map((directory) =>
          directory.id === directoryId ? { ...directory, pageSize } : directory,
        ),
      },
    });
  };

  return (
    <div className="w-72 p-4">
      <h2 className="mb-4 font-medium text-sm">Directory settings</h2>
      <div className="grid gap-4">
        {value.directories.map((directory) => (
          <div className="grid gap-1.5" key={directory.id}>
            {value.directories.length > 1 ? (
              <p className="text-xs font-medium text-sidebar-foreground/55">
                {directory.label}
              </p>
            ) : null}
            <DirectorySettings
              id={`directory-page-size-${directory.id}`}
              onPageSizeChange={(pageSize) =>
                updatePageSize(directory.id, pageSize)
              }
              pageSize={directory.pageSize}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export const directoryExtension = defineOpenEditorReactNode({
  definition: directoryDefinition,
  component: DirectoryNode,
  blockMenu: {
    configure: {
      icon: CogIcon,
      panel: DirectorySettingsPanel,
    },
  },
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
