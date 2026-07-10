"use client";

import "@blocknote/mantine/style.css";

import type { ElementRendererProps } from "@/modules/site-elements/registry";
import type { DecisionTreeNode } from "@baseblocks/domain/elements";
import { Button } from "@baseblocks/ui/button";
import type { Block } from "@blocknote/core";
import { BlockNoteView } from "@blocknote/mantine";
import { useCreateBlockNote } from "@blocknote/react";
import { ChevronRight, GitFork, RotateCcw } from "lucide-react";
import { useTheme } from "next-themes";
import { useState } from "react";

function sortedChildren(nodes: DecisionTreeNode[], parentId: string | null) {
  return nodes
    .filter((node) => node.parentId === parentId)
    .sort((left, right) => left.order - right.order);
}

function hasChildren(nodes: DecisionTreeNode[], nodeId: string) {
  return nodes.some((node) => node.parentId === nodeId);
}

function MiddleText({ text }: { text: string }) {
  return (
    <span className="flex min-w-0 flex-1 items-baseline font-medium">
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

function ReadonlyDocument({ node }: { node: DecisionTreeNode }) {
  const { resolvedTheme } = useTheme();
  const editor = useCreateBlockNote({
    initialContent: node.document as Block[],
  });

  if (node.document.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        This option has no details yet.
      </p>
    );
  }

  return (
    <div className="[&_.bn-container]:!border-none [&_.bn-container]:!bg-transparent [&_.bn-editor]:!bg-transparent [&_.bn-editor]:!px-0">
      <BlockNoteView
        editable={false}
        editor={editor}
        theme={resolvedTheme === "dark" ? "dark" : "light"}
      />
    </div>
  );
}

export function DecisionTreeRenderer({
  content,
}: ElementRendererProps<"decision-tree">) {
  const tree = content.trees[0];
  const nodes = tree?.nodes ?? [];
  const [path, setPath] = useState<string[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const parentId = path.at(-1) ?? null;
  const options = sortedChildren(nodes, parentId);
  const selectedNode = selectedNodeId
    ? (nodes.find((node) => node.id === selectedNodeId) ?? null)
    : null;

  const choose = (node: DecisionTreeNode) => {
    if (hasChildren(nodes, node.id)) {
      setPath((current) => [...current, node.id]);
      setSelectedNodeId(null);
      return;
    }
    setSelectedNodeId(node.id);
  };

  if (!tree || nodes.length === 0) {
    return (
      <div className="not-prose rounded-lg border border-dashed border-border/70 px-4 py-12 text-center text-sm text-muted-foreground">
        This decision tree has no options yet.
      </div>
    );
  }

  return (
    <div className="not-prose overflow-hidden rounded-lg border border-border/70 bg-background shadow-xs">
      <div className="flex min-h-[360px] flex-col lg:grid lg:grid-cols-[minmax(0,0.42fr)_minmax(0,0.58fr)]">
        <div className="flex min-h-0 flex-col border-border/70 lg:border-r">
          <div className="flex min-w-0 items-center gap-1 border-b border-border/70 px-2 py-1.5">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs"
              onClick={() => {
                setPath([]);
                setSelectedNodeId(null);
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
                  setSelectedNodeId(null);
                }}
              >
                {nodes.find((node) => node.id === nodeId)?.name ?? "Option"}
              </button>
            ))}
          </div>

          <div className="min-h-0 flex-1">
            <div className="space-y-1 p-2">
              {options.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 px-4 py-12 text-center">
                  <GitFork className="size-5 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    No more options available.
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setPath([]);
                      setSelectedNodeId(null);
                    }}
                  >
                    <RotateCcw className="size-3.5" />
                    Start over
                  </Button>
                </div>
              ) : (
                options.map((node) => (
                  <button
                    key={node.id}
                    type="button"
                    className="flex w-full min-w-0 items-center gap-2 rounded-lg border border-border/70 bg-background/70 px-3 py-2 text-left text-sm transition-colors hover:bg-accent/40"
                    onClick={() => choose(node)}
                  >
                    <MiddleText text={node.name} />
                    {hasChildren(nodes, node.id) ? (
                      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                    ) : null}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="min-h-[240px]">
          <div className="space-y-3 px-4 py-4">
            {selectedNode ? (
              <>
                <h2 className="text-lg font-semibold">{selectedNode.name}</h2>
                <ReadonlyDocument node={selectedNode} />
              </>
            ) : (
              <div className="flex min-h-[220px] items-center justify-center text-center text-sm text-muted-foreground">
                Choose an option to view its details.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
