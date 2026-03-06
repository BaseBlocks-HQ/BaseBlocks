"use client";

import { cn } from "@/lib/utils";
import { Button } from "@baseblocks/ui/button";
import { Maximize2, Minimize2, RotateCw, ZoomIn, ZoomOut } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ViewerProps } from "../types";

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 5;
const ZOOM_STEP = 0.25;
const WHEEL_ZOOM_SENSITIVITY = 0.002; // Lower = less sensitive

export function ImageViewer({ file, renderControls }: ViewerProps) {
  const [viewerState, setViewerState] = useState({
    zoom: 1,
    rotation: 0,
    position: { x: 0, y: 0 },
    isDragging: false,
    isFitToScreen: true,
  });
  const dragStartRef = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const handleZoomIn = useCallback(() => {
    setViewerState((current) => ({
      ...current,
      zoom: Math.min(current.zoom + ZOOM_STEP, MAX_ZOOM),
      isFitToScreen: false,
    }));
  }, []);

  const handleZoomOut = useCallback(() => {
    setViewerState((current) => ({
      ...current,
      zoom: Math.max(current.zoom - ZOOM_STEP, MIN_ZOOM),
      isFitToScreen: false,
    }));
  }, []);

  const handleRotate = useCallback(() => {
    setViewerState((current) => ({
      ...current,
      rotation: (current.rotation + 90) % 360,
    }));
  }, []);

  const handleFitToggle = useCallback(() => {
    if (viewerState.isFitToScreen) {
      setViewerState((current) => ({
        ...current,
        zoom: 1,
        isFitToScreen: false,
      }));
    } else {
      setViewerState((current) => ({
        ...current,
        zoom: 1,
        position: { x: 0, y: 0 },
        isFitToScreen: true,
      }));
    }
  }, [viewerState.isFitToScreen]);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    // Use smooth proportional zooming with low sensitivity for touchpads
    const delta = -e.deltaY * WHEEL_ZOOM_SENSITIVITY;
    setViewerState((current) => {
      const zoom = Math.max(
        MIN_ZOOM,
        Math.min(MAX_ZOOM, current.zoom * (1 + delta)),
      );
      return {
        ...current,
        zoom,
        isFitToScreen: false,
      };
    });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setViewerState((current) => ({
      ...current,
      isDragging: true,
    }));
    dragStartRef.current = {
      x: e.clientX - viewerState.position.x,
      y: e.clientY - viewerState.position.y,
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!viewerState.isDragging) return;
    setViewerState((current) => ({
      ...current,
      position: {
        x: e.clientX - dragStartRef.current.x,
        y: e.clientY - dragStartRef.current.y,
      },
    }));
  };

  const handleMouseUp = () => {
    setViewerState((current) => ({
      ...current,
      isDragging: false,
    }));
  };

  // Double-click to reset or zoom
  const handleDoubleClick = () => {
    if (viewerState.zoom === 1 && viewerState.isFitToScreen) {
      setViewerState((current) => ({
        ...current,
        zoom: 2,
        isFitToScreen: false,
      }));
    } else {
      setViewerState((current) => ({
        ...current,
        zoom: 1,
        position: { x: 0, y: 0 },
        isFitToScreen: true,
      }));
    }
  };

  // Register controls with parent
  useEffect(() => {
    if (!renderControls) return;

    renderControls(
      <>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={handleZoomOut}
          disabled={viewerState.zoom <= MIN_ZOOM}
          title="Zoom out"
        >
          <ZoomOut className="h-3.5 w-3.5" />
        </Button>
        <span className="text-xs text-muted-foreground min-w-[3rem] text-center tabular-nums">
          {Math.round(viewerState.zoom * 100)}%
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={handleZoomIn}
          disabled={viewerState.zoom >= MAX_ZOOM}
          title="Zoom in"
        >
          <ZoomIn className="h-3.5 w-3.5" />
        </Button>
        <div className="w-px h-4 bg-border mx-0.5" />
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={handleRotate}
          title="Rotate"
        >
          <RotateCw className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={handleFitToggle}
          title={viewerState.isFitToScreen ? "Actual size" : "Fit to screen"}
        >
          {viewerState.isFitToScreen ? (
            <Maximize2 className="h-3.5 w-3.5" />
          ) : (
            <Minimize2 className="h-3.5 w-3.5" />
          )}
        </Button>
      </>,
    );
  }, [
    renderControls,
    viewerState.zoom,
    viewerState.isFitToScreen,
    handleZoomOut,
    handleZoomIn,
    handleRotate,
    handleFitToggle,
  ]);

  return (
    <div
      ref={containerRef}
      role="application"
      aria-label={`Image viewer for ${file.filename}`}
      tabIndex={0}
      className={cn(
        "h-full overflow-hidden flex items-center justify-center bg-muted/20",
        viewerState.isDragging ? "cursor-grabbing" : "cursor-grab",
      )}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onDoubleClick={handleDoubleClick}
    >
      <Image
        src={file.url}
        alt={file.filename}
        className={cn(
          "max-w-none select-none transition-transform duration-100",
          viewerState.isFitToScreen && "max-h-full max-w-full object-contain",
        )}
        width={1600}
        height={900}
        unoptimized
        style={{
          transform: `translate(${viewerState.position.x}px, ${viewerState.position.y}px) scale(${viewerState.zoom}) rotate(${viewerState.rotation}deg)`,
        }}
        draggable={false}
      />
    </div>
  );
}
