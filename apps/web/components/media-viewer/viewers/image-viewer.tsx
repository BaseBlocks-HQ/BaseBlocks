"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Maximize2, Minimize2, RotateCw, ZoomIn, ZoomOut } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ViewerProps } from "../types";

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 5;
const ZOOM_STEP = 0.25;
const WHEEL_ZOOM_SENSITIVITY = 0.002; // Lower = less sensitive

export function ImageViewer({ file }: ViewerProps) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isFitToScreen, setIsFitToScreen] = useState(true);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Reset state when file changes
  useEffect(() => {
    setZoom(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
    setIsFitToScreen(true);
  }, [file.url]);

  const handleZoomIn = useCallback(() => {
    setZoom((prev) => Math.min(prev + ZOOM_STEP, MAX_ZOOM));
    setIsFitToScreen(false);
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((prev) => Math.max(prev - ZOOM_STEP, MIN_ZOOM));
    setIsFitToScreen(false);
  }, []);

  const handleRotate = useCallback(() => {
    setRotation((prev) => (prev + 90) % 360);
  }, []);

  const handleFitToggle = useCallback(() => {
    if (isFitToScreen) {
      setZoom(1);
      setIsFitToScreen(false);
    } else {
      setZoom(1);
      setPosition({ x: 0, y: 0 });
      setIsFitToScreen(true);
    }
  }, [isFitToScreen]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    // Use smooth proportional zooming with low sensitivity for touchpads
    const delta = -e.deltaY * WHEEL_ZOOM_SENSITIVITY;
    setZoom((prev) => {
      const newZoom = prev * (1 + delta);
      return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoom));
    });
    setIsFitToScreen(false);
  }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      setIsDragging(true);
      dragStartRef.current = {
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      };
    },
    [position],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging) return;
      setPosition({
        x: e.clientX - dragStartRef.current.x,
        y: e.clientY - dragStartRef.current.y,
      });
    },
    [isDragging],
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Double-click to reset or zoom
  const handleDoubleClick = useCallback(() => {
    if (zoom === 1 && isFitToScreen) {
      setZoom(2);
      setIsFitToScreen(false);
    } else {
      setZoom(1);
      setPosition({ x: 0, y: 0 });
      setIsFitToScreen(true);
    }
  }, [zoom, isFitToScreen]);

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-center gap-2 p-2 border-b bg-muted/30">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleZoomOut}
          disabled={zoom <= MIN_ZOOM}
          title="Zoom out"
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        <span className="text-sm text-muted-foreground min-w-[4rem] text-center">
          {Math.round(zoom * 100)}%
        </span>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleZoomIn}
          disabled={zoom >= MAX_ZOOM}
          title="Zoom in"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        <div className="w-px h-6 bg-border mx-2" />
        <Button
          variant="ghost"
          size="icon"
          onClick={handleRotate}
          title="Rotate"
        >
          <RotateCw className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleFitToggle}
          title={isFitToScreen ? "Actual size" : "Fit to screen"}
        >
          {isFitToScreen ? (
            <Maximize2 className="h-4 w-4" />
          ) : (
            <Minimize2 className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Image container */}
      <div
        ref={containerRef}
        className={cn(
          "flex-1 overflow-hidden flex items-center justify-center bg-muted/20",
          isDragging ? "cursor-grabbing" : "cursor-grab",
        )}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDoubleClick={handleDoubleClick}
      >
        <img
          src={file.url}
          alt={file.filename}
          className={cn(
            "max-w-none select-none transition-transform duration-100",
            isFitToScreen && "max-h-full max-w-full object-contain",
          )}
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${zoom}) rotate(${rotation}deg)`,
          }}
          draggable={false}
        />
      </div>
    </div>
  );
}
