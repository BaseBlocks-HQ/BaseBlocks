"use client";

import "@blocknote/mantine/style.css";

import { useSiteAssetUpload } from "@/modules/site-elements/use-site-asset-upload";
import { useEditorSite } from "@/modules/editor/editor-state";
import type { ElementEditorProps } from "@/modules/site-elements/registry";
import type { Id } from "@baseblocks/backend";
import type {
  DecisionTree,
  DecisionTreeContent,
  DecisionTreeNode,
} from "@baseblocks/domain/elements";
import { Button } from "@baseblocks/ui/button";
import { Input } from "@baseblocks/ui/input";
import { ScrollArea } from "@baseblocks/ui/scroll-area";
import type { Block } from "@blocknote/core";
import { BlockNoteView } from "@blocknote/mantine";
import { useCreateBlockNote } from "@blocknote/react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  GitFork,
  Plus,
  Trash2,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useMemo, useState } from "react";

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

function sortedChildren(nodes: DecisionTreeNode[], parentId: string | null) {
  return nodes
    .filter((node) => node.parentId === parentId)
    .sort((left, right) => left.order - right.order);
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
  const editor = useCreateBlockNote({
    initialContent: document.length > 0 ? (document as Block[]) : undefined,
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
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const parentId = path.at(-1) ?? null;
  const children = useMemo(
    () => sortedChildren(tree.nodes, parentId),
    [tree.nodes, parentId],
  );
  const selectedNode = selectedId
    ? (tree.nodes.find((node) => node.id === selectedId) ?? null)
    : null;

  const save = (nextTree: DecisionTree) => {
    setTree(nextTree);
    onSaveStatusChange?.("saving");
    onUpdate({ trees: [nextTree] });
    onSaveStatusChange?.("saved");
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
        order: children.length,
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
    setPath((current) => current.filter((id) => !ids.has(id)));
    if (selectedId && ids.has(selectedId)) setSelectedId(null);
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
      <div className="grid min-h-[500px] grid-cols-[minmax(0,0.42fr)_minmax(0,0.58fr)]">
        <div className="flex min-h-0 flex-col border-r border-border/70">
          <div className="flex min-w-0 items-center gap-1 border-b border-border/70 px-2 py-1.5">
            <Button
              type="button"
              size="icon-xs"
              variant="ghost"
              onClick={() => {
                setPath((current) => current.slice(0, -1));
                setSelectedId(null);
              }}
              disabled={path.length === 0}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs"
              onClick={() => {
                setPath([]);
                setSelectedId(null);
              }}
            >
              Root
            </Button>
            {path.map((nodeId, index) => (
              <button
                key={nodeId}
                type="button"
                className="min-w-0 truncate rounded-md px-1.5 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
                onClick={() => {
                  setPath(path.slice(0, index + 1));
                  setSelectedId(null);
                }}
              >
                {tree.nodes.find((node) => node.id === nodeId)?.name ??
                  "Option"}
              </button>
            ))}
          </div>

          <ScrollArea className="min-h-0 flex-1">
            <div className="space-y-1 p-2">
              {children.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 px-4 py-12 text-center">
                  <GitFork className="size-5 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    No options here yet.
                  </p>
                </div>
              ) : (
                children.map((node) => {
                  const hasChildren = tree.nodes.some(
                    (candidate) => candidate.parentId === node.id,
                  );
                  return (
                    <div
                      key={node.id}
                      className="group flex min-w-0 items-center gap-1 rounded-lg border border-border/70 bg-background/70 px-2 py-1.5"
                    >
                      <button
                        type="button"
                        className="flex min-w-0 flex-1 items-center gap-2 text-left text-sm font-medium"
                        onClick={() => setSelectedId(node.id)}
                      >
                        <MiddleText text={node.name} />
                      </button>
                      {hasChildren ? (
                        <Button
                          type="button"
                          size="icon-xs"
                          variant="ghost"
                          onClick={() => {
                            setPath((current) => [...current, node.id]);
                            setSelectedId(null);
                          }}
                        >
                          <ChevronRight className="size-4" />
                        </Button>
                      ) : null}
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
                })
              )}
            </div>
          </ScrollArea>

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

        <div className="flex min-h-0 flex-col">
          {selectedNode ? (
            <>
              <div className="space-y-2 border-b border-border/70 px-4 py-3">
                <Input
                  value={selectedNode.name}
                  className="h-10 text-base font-semibold"
                  onChange={(event) =>
                    renameNode(selectedNode.id, event.target.value)
                  }
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setPath((current) => [...current, selectedNode.id]);
                    setSelectedId(null);
                  }}
                >
                  <Check className="size-4" />
                  Edit children
                </Button>
              </div>
              <ScrollArea className="min-h-0 flex-1">
                <div className="px-4 py-3">
                  <NodeDocumentEditor
                    key={selectedNode.id}
                    document={selectedNode.document}
                    onChange={(document) =>
                      updateDocument(selectedNode.id, document)
                    }
                  />
                </div>
              </ScrollArea>
            </>
          ) : (
            <div className="flex h-full items-center justify-center px-6 text-center text-sm text-muted-foreground">
              Select an option to edit its title and details.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
