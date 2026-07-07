"use client";

import type { PageListItem } from "@baseblocks/types";
import {
  DndContext,
  type DragEndEvent,
  type DragMoveEvent,
  DragOverlay,
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
  use,
  useEffect,
  useRef,
  useState,
} from "react";
import type { DropZone, FlattenedPage, TreeProjection } from "../tree";
import {
  AUTO_EXPAND_DELAY_MS,
  DRAG_INDENT_STEP,
  getDropZone,
  getProjection,
} from "../tree";

interface TreeDndContextValue {
  activeId: UniqueIdentifier | null;
  projection: TreeProjection | null;
  dropZone: DropZone | null;
}

const TreeDndContext = createContext<TreeDndContextValue | null>(null);

export function useTreeDndContext() {
  const ctx = use(TreeDndContext);
  if (!ctx) {
    throw new Error("useTreeDndContext must be used within TreeDndProvider");
  }
  return ctx;
}

interface TreeDndProviderProps {
  children: ReactNode;
  items: FlattenedPage[];
  pages: PageListItem[];
  onDragStart?: (event: DragStartEvent) => void;
  onDragEnd: (event: DragEndEvent, projection: TreeProjection | null) => void;
  onDragCancel?: () => void;
  isExpanded?: (id: string) => boolean;
  onAutoExpand?: (id: string) => void;
  hasChildren?: (id: string) => boolean;
  renderOverlay?: (activeId: UniqueIdentifier) => ReactNode;
}

const measuringConfig = {
  droppable: { strategy: MeasuringStrategy.Always },
};

export function TreeDndProvider({
  children,
  items,
  pages,
  onDragStart,
  onDragEnd,
  onDragCancel,
  isExpanded,
  onAutoExpand,
  hasChildren,
  renderOverlay,
}: TreeDndProviderProps) {
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const [projection, setProjection] = useState<TreeProjection | null>(null);
  const [dropZone, setDropZone] = useState<DropZone | null>(null);

  // Pointer tracking: initial position captured on drag start
  const initialPointerRef = useRef({ x: 0, y: 0 });

  // Auto-expand: expands collapsed folders after hovering inside them
  const expandTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastExpandTargetRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (expandTimerRef.current) clearTimeout(expandTimerRef.current);
    };
  }, []);

  // ---- Auto-expand logic ----

  function scheduleAutoExpand(targetId: string | null) {
    if (lastExpandTargetRef.current !== targetId) {
      if (expandTimerRef.current) {
        clearTimeout(expandTimerRef.current);
        expandTimerRef.current = null;
      }
      lastExpandTargetRef.current = targetId;
    }

    if (
      targetId &&
      onAutoExpand &&
      hasChildren?.(targetId) &&
      !isExpanded?.(targetId) &&
      !expandTimerRef.current
    ) {
      expandTimerRef.current = setTimeout(() => {
        onAutoExpand(targetId);
        expandTimerRef.current = null;
      }, AUTO_EXPAND_DELAY_MS);
    }
  }

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: (event, { currentCoordinates }) => {
        if (event.code === "ArrowLeft") {
          return {
            ...currentCoordinates,
            x: currentCoordinates.x - DRAG_INDENT_STEP,
          };
        }
        if (event.code === "ArrowRight") {
          return {
            ...currentCoordinates,
            x: currentCoordinates.x + DRAG_INDENT_STEP,
          };
        }
        return currentCoordinates;
      },
    }),
  );

  // ---- Helpers ----

  function clearDragState() {
    setActiveId(null);
    setProjection(null);
    setDropZone(null);
    if (expandTimerRef.current) {
      clearTimeout(expandTimerRef.current);
      expandTimerRef.current = null;
    }
    lastExpandTargetRef.current = null;
  }

  // ---- Event handlers ----

  function handleDragStart(event: DragStartEvent) {
    const pe = event.activatorEvent as PointerEvent;
    initialPointerRef.current = { x: pe.clientX, y: pe.clientY };
    setActiveId(event.active.id);
    onDragStart?.(event);
  }

  function handleDragMove(event: DragMoveEvent) {
    const { active, over, delta } = event;

    if (!over) {
      setProjection(null);
      setDropZone(null);
      scheduleAutoExpand(null);
      return;
    }

    // --- Self-hover: un-nesting via dragging down/left past the ghost ---
    if (active.id === over.id) {
      const pointerY = initialPointerRef.current.y + delta.y;
      const ghostBottom = over.rect.top + over.rect.height;
      const distancePastBottom = pointerY - ghostBottom;

      // Combine horizontal drag + vertical distance below ghost into offset
      let effectiveOffsetX = delta.x;
      if (distancePastBottom > 4) {
        const levels = Math.ceil(distancePastBottom / 24);
        effectiveOffsetX = Math.min(
          effectiveOffsetX,
          -levels * DRAG_INDENT_STEP,
        );
      }

      const selfProjection = getProjection(
        items,
        String(active.id),
        String(over.id),
        effectiveOffsetX,
        pages,
        "after",
      );
      setProjection(selfProjection);
      setDropZone(selfProjection ? "after" : null);
      scheduleAutoExpand(null);
      return;
    }

    // --- Normal hover: compute zone and projection ---
    const pointerY = initialPointerRef.current.y + delta.y;
    const overId = String(over.id);

    const zone = getDropZone(
      pointerY,
      over.rect,
      isExpanded?.(overId) ?? false,
      hasChildren?.(overId) ?? false,
    );

    const newProjection = getProjection(
      items,
      String(active.id),
      overId,
      delta.x,
      pages,
      zone,
    );

    setProjection(newProjection);
    setDropZone(zone);

    // Auto-expand when hovering "inside" a collapsed item
    scheduleAutoExpand(zone === "inside" ? overId : null);
  }

  function handleDragEnd(event: DragEndEvent) {
    const currentProjection = projection;
    clearDragState();
    onDragEnd(event, currentProjection);
  }

  function handleDragCancel() {
    clearDragState();
    onDragCancel?.();
  }

  // ---- Render ----

  const itemIds = items.map((item) => item.id);

  return (
    <TreeDndContext.Provider value={{ activeId, projection, dropZone }}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        measuring={measuringConfig}
        onDragStart={handleDragStart}
        onDragMove={handleDragMove}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
          {children}
        </SortableContext>
        <DragOverlay>
          {activeId && renderOverlay ? renderOverlay(activeId) : null}
        </DragOverlay>
      </DndContext>
    </TreeDndContext.Provider>
  );
}
