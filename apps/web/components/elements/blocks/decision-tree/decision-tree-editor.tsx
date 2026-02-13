"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import type { ElementEditorProps } from "@/components/elements/registry";
import { useDebounceCallback } from "@/hooks";
import type {
  DecisionTreeBlockType,
  DecisionTreeContent,
  DecisionTreeNode,
  DecisionTreeContentBlock,
} from "@/types/elements";
import { DEFAULT_BLOCK_CONTENT } from "@/types/elements";
import { useTreeNavigation } from "./editor/use-tree-navigation";
import { NodeList } from "./editor/node-list";
import { NodeDetail } from "./editor/node-detail";

export function DecisionTreeEditor({
  id,
  content,
  onUpdate,
  onSaveStatusChange,
}: ElementEditorProps<"decision-tree">) {
  const [localContent, setLocalContent] =
    useState<DecisionTreeContent>(content);
  const {
    path,
    currentParentId,
    navigateInto,
    navigateToIndex,
  } = useTreeNavigation();

  const debouncedSave = useDebounceCallback(
    useCallback(
      async (newContent: DecisionTreeContent) => {
        onSaveStatusChange?.("saving");
        try {
          await onUpdate(newContent);
          onSaveStatusChange?.("saved");
        } catch {
          onSaveStatusChange?.("idle");
        }
      },
      [onUpdate, onSaveStatusChange],
    ),
    500,
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: Reset local state only when block id changes
  useEffect(() => {
    setLocalContent(content);
  }, [id]);

  const updateContent = useCallback(
    (newContent: DecisionTreeContent) => {
      setLocalContent(newContent);
      onSaveStatusChange?.("pending");
      debouncedSave(newContent);
    },
    [debouncedSave, onSaveStatusChange],
  );

  // --- Node operations ---

  const handleAddNode = useCallback(
    (parentId: string | null, name: string) => {
      const siblings = localContent.nodes.filter(
        (n) => n.parentId === parentId,
      );
      const maxOrder = siblings.reduce(
        (max, n) => Math.max(max, n.order),
        -1,
      );
      const newNode: DecisionTreeNode = {
        id: `node-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        parentId,
        name,
        order: maxOrder + 1,
        contentBlocks: [],
      };
      updateContent({
        ...localContent,
        nodes: [...localContent.nodes, newNode],
      });
    },
    [localContent, updateContent],
  );

  const handleUpdateNode = useCallback(
    (nodeId: string, name: string) => {
      updateContent({
        ...localContent,
        nodes: localContent.nodes.map((n) =>
          n.id === nodeId ? { ...n, name } : n,
        ),
      });
    },
    [localContent, updateContent],
  );

  const handleRemoveNode = useCallback(
    (nodeId: string) => {
      // Recursively collect all descendant IDs
      const idsToRemove = new Set<string>();
      const collect = (id: string) => {
        idsToRemove.add(id);
        for (const child of localContent.nodes.filter(
          (n) => n.parentId === id,
        )) {
          collect(child.id);
        }
      };
      collect(nodeId);

      updateContent({
        ...localContent,
        nodes: localContent.nodes.filter((n) => !idsToRemove.has(n.id)),
      });
    },
    [localContent, updateContent],
  );

  const handleReorderNodes = useCallback(
    (parentId: string | null, orderedIds: string[]) => {
      const updatedNodes = localContent.nodes.map((n) => {
        const idx = orderedIds.indexOf(n.id);
        if (idx !== -1) {
          return { ...n, order: idx };
        }
        return n;
      });
      updateContent({ ...localContent, nodes: updatedNodes });
    },
    [localContent, updateContent],
  );

  // --- Content block operations ---

  const handleAddContentBlock = useCallback(
    (nodeId: string, type: DecisionTreeBlockType) => {
      const node = localContent.nodes.find((n) => n.id === nodeId);
      if (!node) return;

      const maxOrder = node.contentBlocks.reduce(
        (max, b) => Math.max(max, b.order),
        -1,
      );

      const newBlock: DecisionTreeContentBlock = {
        id: `block-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type,
        content: DEFAULT_BLOCK_CONTENT[type],
        order: maxOrder + 1,
      };

      updateContent({
        ...localContent,
        nodes: localContent.nodes.map((n) =>
          n.id === nodeId
            ? { ...n, contentBlocks: [...n.contentBlocks, newBlock] }
            : n,
        ),
      });
    },
    [localContent, updateContent],
  );

  const handleUpdateContentBlock = useCallback(
    (nodeId: string, block: DecisionTreeContentBlock) => {
      updateContent({
        ...localContent,
        nodes: localContent.nodes.map((n) =>
          n.id === nodeId
            ? {
                ...n,
                contentBlocks: n.contentBlocks.map((b) =>
                  b.id === block.id ? block : b,
                ),
              }
            : n,
        ),
      });
    },
    [localContent, updateContent],
  );

  const handleRemoveContentBlock = useCallback(
    (nodeId: string, blockId: string) => {
      updateContent({
        ...localContent,
        nodes: localContent.nodes.map((n) =>
          n.id === nodeId
            ? {
                ...n,
                contentBlocks: n.contentBlocks.filter(
                  (b) => b.id !== blockId,
                ),
              }
            : n,
        ),
      });
    },
    [localContent, updateContent],
  );

  const handleReorderContentBlocks = useCallback(
    (nodeId: string, orderedIds: string[]) => {
      updateContent({
        ...localContent,
        nodes: localContent.nodes.map((n) =>
          n.id === nodeId
            ? {
                ...n,
                contentBlocks: n.contentBlocks.map((b) => {
                  const idx = orderedIds.indexOf(b.id);
                  return idx !== -1 ? { ...b, order: idx } : b;
                }),
              }
            : n,
        ),
      });
    },
    [localContent, updateContent],
  );

  const handleUpdateNodeName = useCallback(
    (nodeId: string, name: string) => {
      handleUpdateNode(nodeId, name);
    },
    [handleUpdateNode],
  );

  // Get the node name for breadcrumb display
  const getNodeName = (nodeId: string) =>
    localContent.nodes.find((n) => n.id === nodeId)?.name ?? "...";

  const currentNode = currentParentId
    ? localContent.nodes.find((n) => n.id === currentParentId) ?? null
    : null;

  return (
    <div className="flex flex-col border rounded-lg overflow-hidden" style={{ height: "500px" }}>
      {/* Breadcrumb Navigation */}
      <div className="flex items-center border-b px-4 py-2 bg-primary/5">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              {path.length > 0 ? (
                <BreadcrumbLink
                  className="cursor-pointer"
                  onClick={() => navigateToIndex(0)}
                >
                  Root
                </BreadcrumbLink>
              ) : (
                <BreadcrumbPage>Root</BreadcrumbPage>
              )}
            </BreadcrumbItem>
            {path.map((nodeId, index) => (
              <span key={nodeId} className="contents">
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  {index === path.length - 1 ? (
                    <BreadcrumbPage>{getNodeName(nodeId)}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink
                      className="cursor-pointer"
                      onClick={() => navigateToIndex(index + 1)}
                    >
                      {getNodeName(nodeId)}
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
              </span>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* Split Panel */}
      <div className="flex flex-1 min-h-0">
        {/* Left: Node List */}
        <div className="w-[40%] border-r overflow-hidden">
          <NodeList
            nodes={localContent.nodes}
            parentId={currentParentId}
            onNavigateInto={navigateInto}
            onAddNode={handleAddNode}
            onUpdateNode={handleUpdateNode}
            onRemoveNode={handleRemoveNode}
            onReorderNodes={handleReorderNodes}
          />
        </div>

        {/* Right: Node Detail */}
        <div className="flex-1 overflow-hidden">
          {currentNode ? (
            <NodeDetail
              node={currentNode}
              onUpdateNodeName={handleUpdateNodeName}
              onUpdateContentBlock={handleUpdateContentBlock}
              onAddContentBlock={handleAddContentBlock}
              onRemoveContentBlock={handleRemoveContentBlock}
              onReorderContentBlocks={handleReorderContentBlocks}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <p className="text-sm">
                Navigate into an option to edit its content
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
