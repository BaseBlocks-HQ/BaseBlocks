"use client";

import { Button } from "@baseblocks/ui/button";
import type { OpenEditorDocument } from "@openeditor/core";
import { OpenEditorViewer } from "@openeditor/react";
import { ChevronRight, GitFork, RotateCcw } from "lucide-react";
import { useState } from "react";

type DecisionNode = {
  id: string;
  parentId: string | null;
  name: string;
  order: number;
  document: OpenEditorDocument;
};
type DecisionTree = { id: string; label: string; nodes: DecisionNode[] };
type DecisionTreeValue = {
  trees: DecisionTree[];
  tabsMode: "row" | "dropdown";
};

export function readDecisionTree(value: unknown): DecisionTreeValue {
  const defaultTrees: DecisionTree[] = [
    { id: "default", label: "Tree 1", nodes: [] },
  ];
  if (!value || typeof value !== "object")
    return { trees: defaultTrees, tabsMode: "row" };
  const candidate = value as Partial<DecisionTreeValue>;
  return {
    trees:
      Array.isArray(candidate.trees) && candidate.trees.length > 0
        ? candidate.trees
        : defaultTrees,
    tabsMode: candidate.tabsMode === "dropdown" ? "dropdown" : "row",
  };
}

export function DecisionTreeViewer({ value }: { value: DecisionTreeValue }) {
  const [treeId, setTreeId] = useState(value.trees[0]?.id ?? "");
  const [path, setPath] = useState<string[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const tree = value.trees.find((item) => item.id === treeId) ?? value.trees[0];
  if (!tree) return null;
  const options = tree.nodes
    .filter((node) => node.parentId === (path.at(-1) ?? null))
    .sort((left, right) => left.order - right.order);
  const selected = tree.nodes.find((node) => node.id === selectedId);
  const hasChildren = (id: string) =>
    tree.nodes.some((node) => node.parentId === id);

  return (
    <section className="not-prose my-4 space-y-3">
      {value.trees.length > 1 ? (
        <div className="flex flex-wrap gap-2">
          {value.trees.map((item) => (
            <Button
              key={item.id}
              onClick={() => {
                setTreeId(item.id);
                setPath([]);
                setSelectedId(null);
              }}
              size="sm"
              type="button"
              variant={item.id === tree.id ? "default" : "outline"}
            >
              {item.label}
            </Button>
          ))}
        </div>
      ) : null}
      <div className="grid min-h-80 gap-3 md:grid-cols-2">
        <div className="rounded-2xl bg-card p-3">
          <Button
            className="rounded-xl"
            onClick={() => {
              setPath([]);
              setSelectedId(null);
            }}
            size="sm"
            type="button"
            variant="ghost"
          >
            <RotateCcw className="size-3.5" />
            Start over
          </Button>
          <div className="mt-2 space-y-2">
            {options.length ? (
              options.map((node) => (
                <button
                  className="flex w-full items-center justify-between rounded-xl bg-background/60 p-3 text-left text-sm font-medium transition hover:-translate-y-0.5 hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  key={node.id}
                  onClick={() => {
                    if (hasChildren(node.id)) {
                      setPath((current) => [...current, node.id]);
                      setSelectedId(null);
                    } else setSelectedId(node.id);
                  }}
                  type="button"
                >
                  {node.name}
                  {hasChildren(node.id) ? (
                    <ChevronRight className="size-4" />
                  ) : null}
                </button>
              ))
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No more options.
              </p>
            )}
          </div>
        </div>
        <div className="rounded-2xl bg-card p-4">
          {selected ? (
            <>
              <h3 className="mb-3 font-semibold">{selected.name}</h3>
              <OpenEditorViewer document={selected.document} />
            </>
          ) : (
            <div className="flex min-h-64 items-center justify-center px-6 text-center text-sm text-muted-foreground">
              <GitFork className="mr-2 size-4" />
              Choose an option.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
