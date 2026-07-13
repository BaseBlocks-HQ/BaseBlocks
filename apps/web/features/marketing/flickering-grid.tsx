"use client";

import { cn } from "@baseblocks/ui/lib/utils";
import type React from "react";
import { useEffect, useRef } from "react";

interface FlickeringGridProps {
  squareSize?: number;
  gridGap?: number;
  flickerChance?: number;
  color?: string;
  width?: number;
  height?: number;
  className?: string;
  maxOpacity?: number;
}

function toRgbaPrefix(color: string) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 1;
  const context = canvas.getContext("2d");
  if (!context) return "rgba(0, 0, 0,";
  context.fillStyle = color;
  context.fillRect(0, 0, 1, 1);
  const [red, green, blue] = context.getImageData(0, 0, 1, 1).data;
  return `rgba(${red}, ${green}, ${blue},`;
}

export const FlickeringGrid: React.FC<FlickeringGridProps> = ({
  squareSize = 4,
  gridGap = 6,
  flickerChance = 0.3,
  color = "rgb(0, 0, 0)",
  width,
  height,
  className,
  maxOpacity = 0.3,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    const context = canvas?.getContext("2d");
    if (!(canvas && container && context)) return;

    const colorPrefix = toRgbaPrefix(color);
    let animationFrameId: number | undefined;
    let visible = false;
    let lastTime = 0;
    let grid = {
      columns: 0,
      rows: 0,
      squares: new Float32Array(),
      dpr: 1,
    };

    const resize = () => {
      const canvasWidth = width ?? container.clientWidth;
      const canvasHeight = height ?? container.clientHeight;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = canvasWidth * dpr;
      canvas.height = canvasHeight * dpr;
      canvas.style.width = `${canvasWidth}px`;
      canvas.style.height = `${canvasHeight}px`;

      const columns = Math.floor(canvasWidth / (squareSize + gridGap));
      const rows = Math.floor(canvasHeight / (squareSize + gridGap));
      const squares = Float32Array.from(
        { length: columns * rows },
        () => Math.random() * maxOpacity,
      );
      grid = { columns, rows, squares, dpr };
    };

    const draw = (time: number) => {
      if (!visible) return;
      const deltaTime = (time - lastTime) / 1000;
      lastTime = time;

      for (let index = 0; index < grid.squares.length; index++) {
        if (Math.random() < flickerChance * deltaTime) {
          grid.squares[index] = Math.random() * maxOpacity;
        }
      }

      context.clearRect(0, 0, canvas.width, canvas.height);
      for (let column = 0; column < grid.columns; column++) {
        for (let row = 0; row < grid.rows; row++) {
          const opacity = grid.squares[column * grid.rows + row];
          context.fillStyle = `${colorPrefix}${opacity})`;
          context.fillRect(
            column * (squareSize + gridGap) * grid.dpr,
            row * (squareSize + gridGap) * grid.dpr,
            squareSize * grid.dpr,
            squareSize * grid.dpr,
          );
        }
      }
      animationFrameId = requestAnimationFrame(draw);
    };

    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);
    const intersectionObserver = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? false;
      if (animationFrameId !== undefined)
        cancelAnimationFrame(animationFrameId);
      if (visible) {
        lastTime = performance.now();
        animationFrameId = requestAnimationFrame(draw);
      }
    });
    intersectionObserver.observe(canvas);

    return () => {
      if (animationFrameId !== undefined)
        cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
    };
  }, [color, flickerChance, gridGap, height, maxOpacity, squareSize, width]);

  return (
    <div className={cn("h-full w-full", className)} ref={containerRef}>
      <canvas className="pointer-events-none" ref={canvasRef} />
    </div>
  );
};
