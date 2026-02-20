"use client";

import type { FlattenedPage, TreeProjection } from "@/lib/tree";
import { INDENT_WIDTH, getProjection } from "@/lib/tree";
import type { PageListItem } from "@baseblocks/types";
import {
  DndContext,
  type DragEndEvent,
  type DragMoveEvent,
  type DragStartEvent,
  KeyboardSensor,
  MeasuringStrategy,
  PointerSensor,
  type UniqueIdentifier,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

/** Delay before auto-expanding a collapsed folder on hover (ms) */
const AUTO_EXPAND_DELAY = 600;

interface TreeDndContextValue {
  activeId: UniqueIdentifier | null;
  overId: UniqueIdentifier | null;
  offsetX: number;
  projection: TreeProjection | null;
  /** ID of the item being hovered for nesting (for highlight effect) */
  nestTargetId: UniqueIdentifier | null;
}

const TreeDndContext = createContext<TreeDndContextValue | null>(null);

export function useTreeDndContext() {
  const context = useContext(TreeDndContext);
  if (!context) {
    throw new Error("useTreeDndContext must be used within TreeDndProvider");
  }
  return context;
}

interface TreeDndProviderProps {
  children: ReactNode;
  items: FlattenedPage[];
  pages: PageListItem[];
  onDragStart?: (event: DragStartEvent) => void;
  onDragEnd: (event: DragEndEvent, projection: TreeProjection | null) => void;
  /** Check if an item is expanded (for auto-expand logic) */
  isExpanded?: (id: string) => boolean;
  /** Callback to expand an item during drag hover */
  onAutoExpand?: (id: string) => void;
  /** Check if an item has children (to know if it can be expanded) */
  hasChildren?: (id: string) => boolean;
}

// Configure measuring strategy for smooth tree DnD
const measuringConfig = {
  droppable: {
    strategy: MeasuringStrategy.Always,
  },
};

export function TreeDndProvider({
  children,
  items,
  pages,
  onDragStart,
  onDragEnd,
  isExpanded,
  onAutoExpand,
  hasChildren,
}: TreeDndProviderProps) {
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const [overId, setOverId] = useState<UniqueIdentifier | null>(null);
  const [offsetX, setOffsetX] = useState(0);
  const [projection, setProjection] = useState<TreeProjection | null>(null);
  const [nestTargetId, setNestTargetId] = useState<UniqueIdentifier | null>(
    null,
  );

  // Auto-expand timer ref
  const expandTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastExpandTargetRef = useRef<string | null>(null);

  // Clear expand timer on unmount
  useEffect(() => {
    return () => {
      if (expandTimerRef.current) {
        clearTimeout(expandTimerRef.current);
      }
    };
  }, []);

  // Handle auto-expand logic
  const handleAutoExpand = useCallback(
    (targetId: string | null, isNesting: boolean) => {
      // Clear existing timer if target changed
      if (lastExpandTargetRef.current !== targetId) {
        if (expandTimerRef.current) {
          clearTimeout(expandTimerRef.current);
          expandTimerRef.current = null;
        }
        lastExpandTargetRef.current = targetId;
      }

      // Update nest target for visual highlight
      setNestTargetId(isNesting && targetId ? targetId : null);

      // Start new timer if hovering over collapsed folder for nesting
      if (
        targetId &&
        isNesting &&
        onAutoExpand &&
        hasChildren?.(targetId) &&
        !isExpanded?.(targetId) &&
        !expandTimerRef.current
      ) {
        expandTimerRef.current = setTimeout(() => {
          onAutoExpand(targetId);
          expandTimerRef.current = null;
        }, AUTO_EXPAND_DELAY);
      }
    },
    [onAutoExpand, hasChildren, isExpanded],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement required to start drag
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: (event, { currentCoordinates }) => {
        // Custom keyboard navigation for tree
        switch (event.code) {
          case "ArrowLeft":
            // Move item left (outdent)
            return {
              ...currentCoordinates,
              x: currentCoordinates.x - INDENT_WIDTH,
            };
          case "ArrowRight":
            // Move item right (indent)
            return {
              ...currentCoordinates,
              x: currentCoordinates.x + INDENT_WIDTH,
            };
          default:
            return currentCoordinates;
        }
      },
    }),
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id);
    setOffsetX(0);
    onDragStart?.(event);
  };

  const handleDragMove = (event: DragMoveEvent) => {
    const { active, over, delta } = event;

    // Update offset based on horizontal drag distance
    setOffsetX(delta.x);

    if (over && active.id !== over.id) {
      setOverId(over.id);

      // Calculate projection based on current position
      const newProjection = getProjection(
        items,
        String(active.id),
        String(over.id),
        delta.x,
        pages,
      );
      setProjection(newProjection);

      // Handle auto-expand for collapsed folders
      const isNesting = newProjection?.position === "child";
      handleAutoExpand(isNesting ? String(over.id) : null, isNesting);
    } else {
      setOverId(null);
      setProjection(null);
      handleAutoExpand(null, false);
    }
  };

  const handleDragOver = (event: DragMoveEvent) => {
    const { active, over, delta } = event;

    if (over && active.id !== over.id) {
      setOverId(over.id);

      // Calculate projection based on current position
      const newProjection = getProjection(
        items,
        String(active.id),
        String(over.id),
        delta.x,
        pages,
      );
      setProjection(newProjection);

      // Handle auto-expand for collapsed folders
      const isNesting = newProjection?.position === "child";
      handleAutoExpand(isNesting ? String(over.id) : null, isNesting);
    } else {
      setOverId(null);
      setProjection(null);
      handleAutoExpand(null, false);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const currentProjection = projection;
    // Reset all state
    setActiveId(null);
    setOverId(null);
    setOffsetX(0);
    setProjection(null);
    setNestTargetId(null);
    // Clear expand timer
    if (expandTimerRef.current) {
      clearTimeout(expandTimerRef.current);
      expandTimerRef.current = null;
    }
    lastExpandTargetRef.current = null;
    onDragEnd(event, currentProjection);
  };

  const handleDragCancel = () => {
    setActiveId(null);
    setOverId(null);
    setOffsetX(0);
    setProjection(null);
    setNestTargetId(null);
    // Clear expand timer
    if (expandTimerRef.current) {
      clearTimeout(expandTimerRef.current);
      expandTimerRef.current = null;
    }
    lastExpandTargetRef.current = null;
  };

  const contextValue: TreeDndContextValue = {
    activeId,
    overId,
    offsetX,
    projection,
    nestTargetId,
  };

  const itemIds = items.map((item) => item.id);

  return (
    <TreeDndContext.Provider value={contextValue}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        measuring={measuringConfig}
        onDragStart={handleDragStart}
        onDragMove={handleDragMove}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
          {children}
        </SortableContext>
      </DndContext>
    </TreeDndContext.Provider>
  );
}

export type { TreeDndContextValue };
