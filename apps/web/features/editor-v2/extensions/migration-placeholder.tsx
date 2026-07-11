"use client";

import {
  defineOpenEditorReactNode,
  NodeViewWrapper,
  type OpenEditorNodeViewProps,
} from "@openeditor/react";
import { Construction } from "lucide-react";

function PlaceholderContent({
  sourceType,
  reason,
}: {
  sourceType: string;
  reason: string;
}) {
  return (
    <div className="rounded-xl border border-dashed border-amber-500/50 bg-amber-500/10 p-4 text-amber-950 dark:text-amber-100">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Construction className="size-4" />
        Pending V2 block: {sourceType}
      </div>
      <p className="mt-1 text-xs opacity-75">{reason}</p>
    </div>
  );
}

function MigrationPlaceholderNode({ node }: OpenEditorNodeViewProps) {
  return (
    <NodeViewWrapper contentEditable={false}>
      <PlaceholderContent
        reason={String(node.attrs.reason ?? "No converter is available.")}
        sourceType={String(node.attrs.sourceType ?? "unknown")}
      />
    </NodeViewWrapper>
  );
}

export const migrationPlaceholderExtension = defineOpenEditorReactNode({
  block: {
    name: "baseblocks.migrationPlaceholder",
    nodeType: "baseblocksMigrationPlaceholder",
    label: "Migration Placeholder",
    group: "embed",
    defaultNode: () => ({
      type: "baseblocksMigrationPlaceholder",
      attrs: {
        sourceBlockId: "",
        sourceType: "unknown",
        reason: "No converter is available.",
      },
    }),
    support: { web: "supported", native: "unsupported" },
  },
  node: {
    group: "block",
    atom: true,
    selectable: true,
    addAttributes: () => ({
      sourceBlockId: { default: "" },
      sourceType: { default: "unknown" },
      reason: { default: "No converter is available." },
    }),
    parseHTML: () => [{ tag: "aside[data-baseblocks-migration-placeholder]" }],
    renderHTML: ({ HTMLAttributes }) => [
      "aside",
      { ...HTMLAttributes, "data-baseblocks-migration-placeholder": "" },
    ],
  },
  component: MigrationPlaceholderNode,
  slashMenu: false,
  viewer: ({ node }) => (
    <PlaceholderContent
      reason={String(node.attrs?.reason ?? "No converter is available.")}
      sourceType={String(node.attrs?.sourceType ?? "unknown")}
    />
  ),
  exporters: {
    html: {
      baseblocksMigrationPlaceholder: ({ node, escapeHtml }) =>
        `<aside data-baseblocks-migration-placeholder><strong>Pending V2 block: ${escapeHtml(String(node.attrs?.sourceType ?? "unknown"))}</strong></aside>`,
    },
    text: {
      baseblocksMigrationPlaceholder: ({ node }) =>
        `[Pending V2 block: ${String(node.attrs?.sourceType ?? "unknown")}]`,
    },
  },
});

export const editorV2Extensions = [migrationPlaceholderExtension] as const;
