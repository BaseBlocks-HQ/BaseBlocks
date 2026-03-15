"use client";

import {
  DndProvider,
  type DragEndEvent,
  arrayMove,
} from "@/modules/shared/dnd";
import { SortableItem } from "@/modules/shared/dnd";
import type { DecisionTreeNode } from "@baseblocks/types/elements";
import { Button } from "@baseblocks/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@baseblocks/ui/dropdown-menu";
import { Input } from "@baseblocks/ui/input";
import {
  Check,
  ChevronRight,
  GitFork,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import type { KeyboardEvent } from "react";
import { useRef, useState } from "react";

interface NodeListProps {
  autoEditNodeId?: string | null;
  nodes: DecisionTreeNode[];
  parentId: string | null;
  onAddParentNode: (nodeId: string) => void;
  onNavigateInto: (nodeId: string) => void;
  onAddNode: (parentId: string | null, name: string) => void;
  onAutoEditHandled?: () => void;
  onUpdateNode: (nodeId: string, name: string) => void;
  onRemoveNode: (nodeId: string) => void;
  onReorderNodes: (parentId: string | null, orderedIds: string[]) => void;
}

export function NodeList({
  autoEditNodeId,
  nodes,
  parentId,
  onAddParentNode,
  onNavigateInto,
  onAddNode,
  onAutoEditHandled,
  onUpdateNode,
  onRemoveNode,
  onReorderNodes,
}: NodeListProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const pendingEditFocusNodeIdRef = useRef<string | null>(null);
  const pendingAddInputFocusRef = useRef(false);

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
    pendingEditFocusNodeIdRef.current = nodeId;
    setEditingId(nodeId);
    setEditingName(currentName);
  };

  const handleSaveEdit = () => {
    const activeEditingId = editingId ?? autoEditNodeId;
    const activeEditingName =
      editingId === null && autoEditNodeId
        ? (childNodes.find((node) => node.id === autoEditNodeId)?.name ?? "")
        : editingName;

    if (!activeEditingId || !activeEditingName.trim()) return;
    onUpdateNode(activeEditingId, activeEditingName.trim());
    setEditingId(null);
    setEditingName("");
    onAutoEditHandled?.();
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingName("");
    onAutoEditHandled?.();
  };

  const handleInputKeyDown = (
    event: KeyboardEvent<HTMLInputElement>,
    onEnter: () => void,
    onEscape: () => void,
  ) => {
    event.stopPropagation();

    if (event.key === "Enter") {
      onEnter();
    }

    if (event.key === "Escape") {
      onEscape();
    }
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

  const handleEditInputRef = (
    input: HTMLInputElement | null,
    node: DecisionTreeNode,
  ) => {
    if (!input) {
      return;
    }

    if (autoEditNodeId === node.id && editingId !== node.id) {
      pendingEditFocusNodeIdRef.current = node.id;
      setEditingId(node.id);
      setEditingName(node.name);
      onAutoEditHandled?.();
    }

    if (pendingEditFocusNodeIdRef.current !== node.id) {
      return;
    }

    pendingEditFocusNodeIdRef.current = null;
    queueMicrotask(() => {
      input.focus();
      input.select();
    });
  };

  const handleAddInputRef = (input: HTMLInputElement | null) => {
    if (!input || !pendingAddInputFocusRef.current) {
      return;
    }

    pendingAddInputFocusRef.current = false;
    queueMicrotask(() => {
      input.focus();
      input.select();
    });
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
                {/* biome-ignore lint/a11y/useKeyWithClickEvents: keyboard navigation handled by inner interactive buttons */}
                <div
                  role="presentation"
                  className="group flex items-center gap-2 rounded-lg border border-transparent px-4 py-3 cursor-pointer transition-colors hover:bg-primary/5 hover:border-primary/20"
                  onClick={() => {
                    onNavigateInto(node.id);
                  }}
                >
                  {editingId === node.id || autoEditNodeId === node.id ? (
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Input
                        ref={(input) => handleEditInputRef(input, node)}
                        value={editingId === node.id ? editingName : node.name}
                        onChange={(e) => {
                          if (editingId !== node.id) {
                            setEditingId(node.id);
                            onAutoEditHandled?.();
                          }
                          setEditingName(e.target.value);
                        }}
                        onKeyDown={(event) =>
                          handleInputKeyDown(
                            event,
                            handleSaveEdit,
                            handleCancelEdit,
                          )
                        }
                        className="h-8 text-sm"
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
                        <DropdownMenu
                          open={openMenuId === node.id}
                          onOpenChange={(open) =>
                            setOpenMenuId(open ? node.id : null)
                          }
                        >
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="size-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity data-[state=open]:opacity-100"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreHorizontal className="size-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                onAddParentNode(node.id);
                                setOpenMenuId(null);
                              }}
                            >
                              <Plus className="size-4 mr-2" />
                              Add parent
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStartEdit(node.id, node.name);
                                setOpenMenuId(null);
                              }}
                            >
                              <Pencil className="size-4 mr-2" />
                              Rename
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                onRemoveNode(node.id);
                                setOpenMenuId(null);
                              }}
                            >
                              <Trash2 className="size-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
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
                ref={handleAddInputRef}
                value={newName}
                placeholder="Option name..."
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(event) =>
                  handleInputKeyDown(event, handleAdd, () => {
                    setIsAdding(false);
                    setNewName("");
                  })
                }
                className="h-9 text-sm"
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
              onClick={() => {
                pendingAddInputFocusRef.current = true;
                setIsAdding(true);
              }}
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
