"use client";

import {
  baseBlocksSlashMenuOrder,
  createOpenEditorIcon,
} from "@/features/openeditor/slash-menu";
import { GitForkIcon } from "@hugeicons/core-free-icons";
import {
  DecisionTree,
  DecisionTreeViewer,
  readDecisionTree,
} from "@/features/openeditor/renderers/decision-tree";
import type { OpenEditorDocument } from "@openeditor/core";
import { decisionTreeDefinition } from "@baseblocks/openeditor-contracts";
import {
  defineOpenEditorReactNode,
  NodeViewWrapper,
  OpenEditorContent,
  type OpenEditorNodeViewProps,
  useOpenEditorController,
} from "@openeditor/react";
import { toHtml, toPlainText } from "@openeditor/exporters";
const nestedDocumentExtensions = [] as const;
const DecisionTreeMenuIcon = createOpenEditorIcon(GitForkIcon);

function NestedEditor({
  initialDocument,
  onChange,
}: {
  initialDocument: OpenEditorDocument;
  onChange: (document: OpenEditorDocument) => void;
}) {
  const controller = useOpenEditorController({
    initialDocument,
    onChange,
    extensions: nestedDocumentExtensions,
  });
  return (
    <OpenEditorContent className="oe-canvas min-h-40" controller={controller} />
  );
}

function DecisionTreeNode({
  editor,
  node,
  updateAttributes,
}: OpenEditorNodeViewProps) {
  const value = readDecisionTree(node.attrs.decisionTree);
  return (
    <NodeViewWrapper contentEditable={false}>
      {editor.isEditable ? (
        <DecisionTree
          onChange={(decisionTree) => updateAttributes({ decisionTree })}
          renderDocument={(activeNode, onChange) => (
            <NestedEditor
              initialDocument={activeNode.document}
              key={activeNode.id}
              onChange={onChange}
            />
          )}
          value={value}
        />
      ) : (
        <DecisionTreeViewer value={value} />
      )}
    </NodeViewWrapper>
  );
}

export const decisionTreeExtension = defineOpenEditorReactNode({
  definition: decisionTreeDefinition,
  component: DecisionTreeNode,
  insertMenu: {
    icon: DecisionTreeMenuIcon,
    keywords: ["decision", "branch", "wizard", "guide"],
    order: baseBlocksSlashMenuOrder.decisionTree,
  },
  viewer: ({ node }) => (
    <DecisionTreeViewer value={readDecisionTree(node.attrs?.decisionTree)} />
  ),
  exporters: {
    html: {
      baseblocksDecisionTree: ({ node, escapeHtml }) =>
        readDecisionTree(node.attrs?.decisionTree)
          .trees.map(
            (tree) =>
              `<section data-baseblocks-decision-tree><h2>${escapeHtml(tree.label)}</h2><ul>${tree.nodes.map((item) => `<li><strong>${escapeHtml(item.name)}</strong>${toHtml(item.document)}</li>`).join("")}</ul></section>`,
          )
          .join(""),
    },
    text: {
      baseblocksDecisionTree: ({ node }) =>
        readDecisionTree(node.attrs?.decisionTree)
          .trees.flatMap((tree) => [
            tree.label,
            ...tree.nodes.map((item) =>
              [
                `${"  ".repeat(item.parentId ? 1 : 0)}${item.name}`,
                toPlainText(item.document),
              ]
                .filter(Boolean)
                .join("\n"),
            ),
          ])
          .join("\n"),
    },
  },
});
