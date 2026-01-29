"use client";

import { DragHandle } from "@/components/dnd";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Trash2 } from "lucide-react";
import { type HTMLAttributes, type Ref, forwardRef } from "react";

interface DragHandlePropsWithRef extends HTMLAttributes<HTMLDivElement> {
  ref?: Ref<HTMLDivElement>;
}

interface BlockToolbarProps extends HTMLAttributes<HTMLDivElement> {
  onRemove: () => void;
  dragHandleProps?: DragHandlePropsWithRef;
}

export const BlockToolbar = forwardRef<HTMLDivElement, BlockToolbarProps>(
  ({ onRemove, dragHandleProps, className, ...props }, ref) => {
    const { ref: dragRef, ...restDragHandleProps } = dragHandleProps ?? {};

    return (
      <div
        ref={ref}
        className={cn(
          "absolute -left-10 top-0 flex flex-col gap-0.5",
          "opacity-0 group-hover/block:opacity-100 transition-opacity duration-150",
          className,
        )}
        {...props}
      >
        <DragHandle ref={dragRef} {...restDragHandleProps} />
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground hover:text-destructive"
          onClick={onRemove}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    );
  },
);

BlockToolbar.displayName = "BlockToolbar";
