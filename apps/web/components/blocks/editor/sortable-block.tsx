"use client";

import type { ReactNode } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { BlockToolbar } from "./block-toolbar";
import { cn } from "@/lib/utils";

interface SortableBlockProps {
  id: string;
  children: ReactNode;
  onRemove: () => void;
}

export function SortableBlock({ id, children, onRemove }: SortableBlockProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // When dragging, show a placeholder where the item will drop
  if (isDragging) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="relative pl-10 min-h-[60px] rounded-lg border-2 border-dashed border-primary/50 bg-primary/5"
      />
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group/block relative pl-10"
    >
      <BlockToolbar
        onRemove={onRemove}
        dragHandleProps={{
          ref: setActivatorNodeRef,
          ...attributes,
          ...listeners,
        }}
      />
      {children}
    </div>
  );
}
