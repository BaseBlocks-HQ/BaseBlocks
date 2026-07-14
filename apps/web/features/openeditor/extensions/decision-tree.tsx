"use client";

import { baseBlocksSlashMenuOrder } from "@/features/openeditor/slash-menu";
import {
  DecisionTree,
  DecisionTreeViewer,
  type DecisionTreeValue,
  readDecisionTree,
} from "@/features/openeditor/renderers/decision-tree";
import type { OpenEditorDocument } from "@openeditor/core";
import {
  defineOpenEditorReactNode,
  NodeViewWrapper,
  OpenEditorContent,
  type OpenEditorNodeViewProps,
  useOpenEditorController,
} from "@openeditor/react";
import { toHtml, toPlainText } from "@openeditor/exporters";
import { GitFork } from "lucide-react";
const nestedDocumentExtensions = [] as const;

const defaultValue = (): DecisionTreeValue => ({
  trees: [{ id: "default", label: "Tree 1", nodes: [] }],
  tabsMode: "row",
});

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
  block: {
    name: "baseblocks.decisionTree",
    nodeType: "baseblocksDecisionTree",
    label: "Decision Tree",
    group: "embed",
    defaultNode: () => ({
      type: "baseblocksDecisionTree",
      attrs: { decisionTree: defaultValue() },
    }),
    support: { web: "supported", native: "unsupported" },
  },
  node: {
    group: "block",
    atom: true,
    draggable: true,
    addAttributes: () => ({ decisionTree: { default: defaultValue() } }),
    parseHTML: () => [{ tag: "section[data-baseblocks-decision-tree]" }],
    renderHTML: ({ HTMLAttributes }) => [
      "section",
      { ...HTMLAttributes, "data-baseblocks-decision-tree": "" },
    ],
  },
  component: DecisionTreeNode,
  insertMenu: {
    icon: GitFork,
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
