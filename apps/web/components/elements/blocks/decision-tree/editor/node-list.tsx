"use client";

import {
  DndProvider,
  type DragEndEvent,
  arrayMove,
} from "@repo/editor/dnd/dnd-provider";
import { SortableItem } from "@repo/editor/dnd/sortable-item";
import type { DecisionTreeNode } from "@repo/types/elements";
import { Button } from "@repo/ui/button";
import { Input } from "@repo/ui/input";
import {
  Check,
  ChevronRight,
  GitFork,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useState } from "react";

interface NodeListProps {
  nodes: DecisionTreeNode[];
  parentId: string | null;
  onNavigateInto: (nodeId: string) => void;
  onAddNode: (parentId: string | null, name: string) => void;
  onUpdateNode: (nodeId: string, name: string) => void;
  onRemoveNode: (nodeId: string) => void;
  onReorderNodes: (parentId: string | null, orderedIds: string[]) => void;
}

export function NodeList({
  nodes,
  parentId,
  onNavigateInto,
  onAddNode,
  onUpdateNode,
  onRemoveNode,
  onReorderNodes,
}: NodeListProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const childNodes = nodes
    .filter((n) => n.parentId === parentId)
    .sort((a, b) => a.order - b.order);

  const nodeIds = childNodes.map((n) => n.id);

  const handleAdd = () => {
    if (!newName.trim()) return;
    onAddNode(parentId, newName.trim());
    setNewName("");
    setIsAdding(false);
  };

  const handleStartEdit = (nodeId: string, currentName: string) => {
    setEditingId(nodeId);
    setEditingName(currentName);
  };

  const handleSaveEdit = () => {
    if (!editingId || !editingName.trim()) return;
    onUpdateNode(editingId, editingName.trim());
    setEditingId(null);
    setEditingName("");
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingName("");
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = nodeIds.indexOf(active.id as string);
    const newIndex = nodeIds.indexOf(over.id as string);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(nodeIds, oldIndex, newIndex);
    onReorderNodes(parentId, reordered);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="p-3 space-y-1.5">
          <DndProvider
            items={nodeIds}
            onDragEnd={handleDragEnd}
            renderDragOverlay={(activeId) => {
              const node = childNodes.find((n) => n.id === activeId);
              if (!node) return null;
              return (
                <div className="flex items-center gap-2 rounded-lg border bg-background px-4 py-3 shadow-lg opacity-90">
                  <span className="text-sm font-medium truncate">
                    {node.name}
                  </span>
                </div>
              );
            }}
          >
            {childNodes.map((node) => (
              <SortableItem key={node.id} id={node.id}>
                <div
                  className="group flex items-center gap-2 rounded-lg border border-transparent px-4 py-3 cursor-pointer transition-colors hover:bg-primary/5 hover:border-primary/20"
                  onClick={() => onNavigateInto(node.id)}
                >
                  {editingId === node.id ? (
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Input
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveEdit();
                          if (e.key === "Escape") handleCancelEdit();
                        }}
                        className="h-8 text-sm"
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="size-8 p-0 shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSaveEdit();
                        }}
                      >
                        <Check className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="size-8 p-0 shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCancelEdit();
                        }}
                      >
                        <X className="size-4" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <span className="flex-1 text-sm font-medium truncate min-w-0">
                        {node.name}
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="size-8 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartEdit(node.id, node.name);
                            }}
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="size-8 p-0 text-muted-foreground hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              onRemoveNode(node.id);
                            }}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                        <ChevronRight className="size-4 text-muted-foreground group-hover:text-primary" />
                      </div>
                    </>
                  )}
                </div>
              </SortableItem>
            ))}
          </DndProvider>

          {childNodes.length === 0 && !isAdding && (
            <div className="flex flex-col items-center justify-center gap-2 py-10 px-4">
              <div className="size-10 rounded-full bg-muted/60 flex items-center justify-center">
                <GitFork className="size-5 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground text-sm text-center font-medium">
                No options yet
              </p>
              <p className="text-muted-foreground/70 text-xs text-center">
                Add options for users to navigate through
              </p>
            </div>
          )}

          {isAdding ? (
            <div className="flex items-center gap-2 p-1">
              <Input
                value={newName}
                placeholder="Option name..."
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAdd();
                  if (e.key === "Escape") {
                    setIsAdding(false);
                    setNewName("");
                  }
                }}
                className="h-9 text-sm"
                autoFocus
              />
              <Button
                variant="ghost"
                size="sm"
                className="size-9 p-0 shrink-0"
                onClick={handleAdd}
              >
                <Check className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="size-9 p-0 shrink-0"
                onClick={() => {
                  setIsAdding(false);
                  setNewName("");
                }}
              >
                <X className="size-4" />
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="w-full mt-2"
              onClick={() => setIsAdding(true)}
            >
              <Plus className="size-4 mr-2" />
              Add Option
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
