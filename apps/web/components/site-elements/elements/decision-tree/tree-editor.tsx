"use client";

import "@blocknote/mantine/style.css";

import { useAutoSave } from "@/features/editor/use-auto-save";
import { InlineRename } from "@/components/tree/inline-rename";
import { useSiteAssetUpload } from "@/components/site-elements/use-site-asset-upload";
import { useEditorSite } from "@/features/editor/editor-state";
import type { ElementEditorProps } from "@/components/site-elements/registry";
import type { Id } from "@baseblocks/backend";
import type {
  DecisionTree,
  DecisionTreeContent,
  DecisionTreeNode,
} from "@baseblocks/domain/elements";
import { Button } from "@baseblocks/ui/button";
import { Input } from "@baseblocks/ui/input";
import type { Block } from "@blocknote/core";
import { BlockNoteView } from "@blocknote/mantine";
import { useCreateBlockNote } from "@blocknote/react";
import { Plus, Trash2 } from "lucide-react";
import { useTheme } from "next-themes";
import { useState } from "react";
import {
  removeDecisionTreeNodesFromPath,
  resolveDecisionTreeEditor,
} from "./editor-model";
import { DecisionTreeEditorBreadcrumb } from "./editor-breadcrumb";
import { DecisionTreeEditorEmptyState } from "./editor-empty-state";

function makeNodeId() {
  return `node-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function normalizeTree(content: DecisionTreeContent): DecisionTree {
  return (
    content.trees[0] ?? {
      id: "default",
      label: "Tree",
      nodes: [],
    }
  );
}

function descendantsOf(nodes: DecisionTreeNode[], nodeId: string) {
  const ids = new Set([nodeId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const node of nodes) {
      if (node.parentId && ids.has(node.parentId) && !ids.has(node.id)) {
        ids.add(node.id);
        changed = true;
      }
    }
  }
  return ids;
}

function MiddleText({ text }: { text: string }) {
  return (
    <span className="flex min-w-0 flex-1 items-baseline">
      <span className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">
        {text.slice(0, Math.ceil(text.length / 2))}
      </span>
      <span className="shrink-0 px-px text-muted-foreground/70">...</span>
      <span className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-right">
        {text.slice(Math.ceil(text.length / 2))}
      </span>
    </span>
  );
}

function NodeDocumentEditor({
  document,
  onChange,
}: {
  document: unknown[];
  onChange: (document: unknown[]) => void;
}) {
  const { resolvedTheme } = useTheme();
  const { siteId } = useEditorSite();
  const { uploadSiteAsset } = useSiteAssetUpload();
  const [initialContent] = useState(() =>
    document.length > 0 ? (document as Block[]) : undefined,
  );
  const editor = useCreateBlockNote({
    initialContent,
    uploadFile: async (file) => {
      const asset = await uploadSiteAsset(file, siteId as Id<"sites">);
      if (!asset) throw new Error("Upload failed");
      return asset.url;
    },
  });

  return (
    <div
      className="[&_.bn-container]:!border-none [&_.bn-container]:!bg-transparent [&_.bn-editor]:!bg-transparent [&_.bn-editor]:!px-0"
      onKeyDown={(event) => event.stopPropagation()}
    >
      <BlockNoteView
        editor={editor}
        theme={resolvedTheme === "dark" ? "dark" : "light"}
        onChange={() => onChange(editor.document)}
      />
    </div>
  );
}

export function DecisionTreeEditor({
  content,
  onUpdate,
  onSaveStatusChange,
}: ElementEditorProps<"decision-tree">) {
  const [tree, setTree] = useState(() => normalizeTree(content));
  const [path, setPath] = useState<string[]>([]);
  const [newName, setNewName] = useState("");
  const persist = useAutoSave(onUpdate, onSaveStatusChange);
  const {
    activeNode,
    path: validPath,
    visibleOptions,
  } = resolveDecisionTreeEditor(tree.nodes, path);
  const parentId = activeNode?.id ?? null;

  const save = (nextTree: DecisionTree) => {
    setTree(nextTree);
    onSaveStatusChange?.("pending");
    persist({ ...content, trees: [nextTree] });
  };

  const updateNodes = (nodes: DecisionTreeNode[]) => {
    save({ ...tree, nodes });
  };

  const addNode = () => {
    const name = newName.trim();
    if (!name) return;
    updateNodes([
      ...tree.nodes,
      {
        id: makeNodeId(),
        parentId,
        name,
        order: visibleOptions.length,
        document: [],
      },
    ]);
    setNewName("");
  };

  const renameNode = (nodeId: string, name: string) => {
    updateNodes(
      tree.nodes.map((node) => (node.id === nodeId ? { ...node, name } : node)),
    );
  };

  const removeNode = (nodeId: string) => {
    const ids = descendantsOf(tree.nodes, nodeId);
    updateNodes(tree.nodes.filter((node) => !ids.has(node.id)));
    setPath((current) => removeDecisionTreeNodesFromPath(current, ids));
  };

  const updateDocument = (nodeId: string, document: unknown[]) => {
    updateNodes(
      tree.nodes.map((node) =>
        node.id === nodeId ? { ...node, document } : node,
      ),
    );
  };

  return (
    <div className="overflow-hidden rounded-lg border border-border/70 bg-background shadow-xs">
      <div className="grid h-[500px] max-h-[70vh] grid-cols-[minmax(0,0.42fr)_minmax(0,0.58fr)] overflow-hidden">
        <div className="flex min-h-0 flex-col border-r border-border/70">
          <div>
            <DecisionTreeEditorBreadcrumb
              getNodeName={(nodeId) =>
                tree.nodes.find((node) => node.id === nodeId)?.name ?? "Option"
              }
              onNavigate={setPath}
              path={validPath}
            />
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            {visibleOptions.length === 0 ? (
              <DecisionTreeEditorEmptyState variant="options" />
            ) : (
              <div className="space-y-1">
                {visibleOptions.map((node) => {
                  return (
                    <div
                      key={node.id}
                      className="group flex min-w-0 items-center gap-1 rounded-lg border border-border/70 bg-background/70 px-1 py-1 transition-colors hover:bg-accent/40"
                    >
                      <button
                        type="button"
                        className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-1 py-0.5 text-left text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        onClick={() => setPath([...validPath, node.id])}
                      >
                        <MiddleText text={node.name} />
                      </button>
                      <Button
                        type="button"
                        size="icon-xs"
                        variant="ghost"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => removeNode(node.id)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex gap-1.5 border-t border-border/70 p-2">
            <Input
              value={newName}
              placeholder="Add option"
              className="h-9"
              onChange={(event) => setNewName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") addNode();
              }}
            />
            <Button type="button" size="icon-sm" onClick={addNode}>
              <Plus className="size-4" />
            </Button>
          </div>
        </div>

        <div className="flex min-h-0 flex-col overflow-hidden">
          {activeNode ? (
            <>
              <div className="border-b border-border/70 px-4 py-3">
                <InlineRename
                  label={`Rename ${activeNode.name}`}
                  value={activeNode.name}
                  onCancel={() => undefined}
                  onSave={(name) => renameNode(activeNode.id, name)}
                />
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto">
                <div className="px-4 py-3">
                  <NodeDocumentEditor
                    key={activeNode.id}
                    document={activeNode.document}
                    onChange={(document) =>
                      updateDocument(activeNode.id, document)
                    }
                  />
                </div>
              </div>
            </>
          ) : (
            <DecisionTreeEditorEmptyState variant="selection" />
          )}
        </div>
      </div>
    </div>
  );
}
