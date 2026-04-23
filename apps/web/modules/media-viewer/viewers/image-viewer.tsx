"use client";

import { cn } from "@/lib/utils";
import { Button } from "@baseblocks/ui/button";
import { Maximize2, Minimize2, RotateCw } from "lucide-react";
import Image from "next/image";
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
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={rotate}
          title="Rotate"
        >
          <RotateCw className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className={cn("h-7 w-7", fitToFrame && "bg-muted")}
          onClick={toggleFit}
          title={fitToFrame ? "Actual size" : "Fit to frame"}
        >
          {fitToFrame ? (
            <Maximize2 className="h-3.5 w-3.5" />
          ) : (
            <Minimize2 className="h-3.5 w-3.5" />
          )}
        </Button>
      </>,
    );
  }, [fitToFrame, renderControls, rotate, toggleFit]);

  return (
    <div
      aria-label={`Image viewer for ${file.filename}`}
      className="grid h-full min-h-0 min-w-0 place-items-center overflow-auto bg-muted/20 p-4"
      role="img"
    >
      <Image
        alt={file.filename}
        className={cn(
          "block select-none rounded-sm shadow-sm ring-1 ring-border/50",
          fitToFrame
            ? "max-h-full max-w-full object-contain"
            : "max-w-none object-none",
        )}
        draggable={false}
        height={900}
        src={file.url}
        style={{ transform: `rotate(${rotation}deg)` }}
        unoptimized
        width={1600}
      />
    </div>
  );
}
