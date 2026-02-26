"use client";

import { cn } from "@baseblocks/ui/lib/utils";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { ReactNode } from "react";

interface SortableItemProps {
  id: string;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
}

export function SortableItem({
  id,
  children,
  className,
  disabled = false,
}: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn("relative", isDragging && "opacity-50 z-50", className)}
      {...attributes}
      {...listeners}
    >
      {children}
    </div>
  );
}

export { useSortable };
