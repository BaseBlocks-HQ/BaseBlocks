"use client";

import { cn } from "@/lib/utils";
import { ViewerToolbarIconButton } from "@/modules/media-viewer/components/viewer-toolbar-icon-button";
import { Maximize2, Minimize2, RotateCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { ViewerProps } from "../types";

export function ImageViewer({ file, renderControls }: ViewerProps) {
  const [fitToFrame, setFitToFrame] = useState(true);
  const [rotation, setRotation] = useState(0);

  const rotate = useCallback(() => {
    setRotation((value) => (value + 90) % 360);
  }, []);

  const toggleFit = useCallback(() => {
    setFitToFrame((value) => !value);
  }, []);

  useEffect(() => {
    if (!renderControls) return;

    renderControls(
      <>
        <ViewerToolbarIconButton label="Rotate" onClick={rotate}>
          <RotateCw className="h-4 w-4" />
        </ViewerToolbarIconButton>
        <ViewerToolbarIconButton
          className={cn(fitToFrame && "bg-primary/10 text-primary")}
          label={fitToFrame ? "Actual size" : "Fit to frame"}
          onClick={toggleFit}
          pressed={fitToFrame}
        >
          {fitToFrame ? (
            <Maximize2 className="h-4 w-4" />
          ) : (
            <Minimize2 className="h-4 w-4" />
          )}
        </ViewerToolbarIconButton>
      </>,
    );
  }, [fitToFrame, renderControls, rotate, toggleFit]);

  return (
    <div
      aria-label={`Image viewer for ${file.filename}`}
      className="grid h-full min-h-0 min-w-0 place-items-center overflow-auto bg-muted/20 p-4 pt-14 overscroll-contain"
      role="img"
    >
      <img
        alt={file.filename}
        className={cn(
          "block select-none rounded-sm shadow-sm outline outline-1 outline-border/50",
          fitToFrame
            ? "max-h-full max-w-full object-contain"
            : "max-w-none object-none",
        )}
        draggable={false}
        src={file.url}
        style={{ transform: `rotate(${rotation}deg)` }}
      />
    </div>
  );
}
