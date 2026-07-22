"use client";

import { cn } from "@baseblocks/ui/lib/utils";
import { useEffect, useRef } from "react";

interface FlickeringGridProps {
  className?: string;
  flickerChance?: number;
  gridGap?: number;
  height?: number;
  maxOpacity?: number;
  squareSize?: number;
  width?: number;
}

interface GridState {
  dpr: number;
  rows: number;
  squares: Float32Array;
}

const FRAME_INTERVAL_MS = 1000 / 12;
const MAX_DEVICE_PIXEL_RATIO = 2;

export function FlickeringGrid({
  className,
  flickerChance = 0.3,
  gridGap = 6,
  height,
  maxOpacity = 0.3,
  squareSize = 4,
  width,
}: FlickeringGridProps) {
  "use no memo";
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    const context = canvas?.getContext("2d");
    if (!(canvas && container && context)) return;

    let color = getComputedStyle(container).color;
    let grid: GridState | null = null;
    let inView = false;
    let initialized = false;
    let lastTick = performance.now();
    let resizeFrameId: number | undefined;
    let timeoutId: number | undefined;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    const drawSquare = (index: number) => {
      if (!grid) return;
      const column = Math.floor(index / grid.rows);
      const row = index % grid.rows;
      const pitch = squareSize + gridGap;
      const x = column * pitch * grid.dpr;
      const y = row * pitch * grid.dpr;
      const size = squareSize * grid.dpr;

      context.clearRect(x, y, size, size);
      context.globalAlpha = grid.squares[index] ?? 0;
      context.fillStyle = color;
      context.fillRect(x, y, size, size);
    };

    const drawAll = () => {
      if (!grid) return;
      context.clearRect(0, 0, canvas.width, canvas.height);
      for (let index = 0; index < grid.squares.length; index++) {
        drawSquare(index);
      }
      context.globalAlpha = 1;
    };

    const resize = () => {
      const canvasWidth = width ?? container.clientWidth;
      const canvasHeight = height ?? container.clientHeight;
      const dpr = Math.min(
        window.devicePixelRatio || 1,
        MAX_DEVICE_PIXEL_RATIO,
      );
      canvas.width = Math.round(canvasWidth * dpr);
      canvas.height = Math.round(canvasHeight * dpr);
      canvas.style.width = `${canvasWidth}px`;
      canvas.style.height = `${canvasHeight}px`;

      const pitch = squareSize + gridGap;
      const columns = Math.floor(canvasWidth / pitch);
      const rows = Math.floor(canvasHeight / pitch);
      const squares = Float32Array.from(
        { length: columns * rows },
        () => Math.random() * maxOpacity,
      );
      grid = { dpr, rows, squares };
      drawAll();
    };

    const stop = () => {
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
      timeoutId = undefined;
    };

    const tick = () => {
      stop();
      if (!grid || !inView || document.hidden || reducedMotion.matches) return;

      const now = performance.now();
      const deltaTime = Math.min((now - lastTick) / 1000, 0.25);
      lastTick = now;

      const expectedUpdates = grid.squares.length * flickerChance * deltaTime;
      const updateCount =
        Math.floor(expectedUpdates) +
        (Math.random() < expectedUpdates % 1 ? 1 : 0);

      for (let update = 0; update < updateCount; update++) {
        const index = Math.floor(Math.random() * grid.squares.length);
        grid.squares[index] = Math.random() * maxOpacity;
        drawSquare(index);
      }
      context.globalAlpha = 1;
      timeoutId = window.setTimeout(tick, FRAME_INTERVAL_MS);
    };

    const start = () => {
      stop();
      lastTick = performance.now();
      if (inView && !document.hidden && !reducedMotion.matches) {
        timeoutId = window.setTimeout(tick, FRAME_INTERVAL_MS);
      }
    };

    const resizeObserver = new ResizeObserver(() => {
      if (!initialized) return;
      if (resizeFrameId !== undefined) cancelAnimationFrame(resizeFrameId);
      resizeFrameId = requestAnimationFrame(resize);
    });
    resizeObserver.observe(container);

    const intersectionObserver = new IntersectionObserver(([entry]) => {
      inView = entry?.isIntersecting ?? false;
      if (inView) {
        if (!initialized) {
          initialized = true;
          resize();
        }
        start();
      } else stop();
    });
    intersectionObserver.observe(canvas);

    const handleVisibilityChange = () => {
      if (document.hidden) stop();
      else start();
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    const handleMotionChange = () => {
      if (reducedMotion.matches) stop();
      else start();
    };
    reducedMotion.addEventListener("change", handleMotionChange);

    const themeObserver = new MutationObserver(() => {
      color = getComputedStyle(container).color;
      drawAll();
    });
    themeObserver.observe(document.documentElement, {
      attributeFilter: ["class"],
      attributes: true,
    });

    return () => {
      stop();
      if (resizeFrameId !== undefined) cancelAnimationFrame(resizeFrameId);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      themeObserver.disconnect();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      reducedMotion.removeEventListener("change", handleMotionChange);
    };
  }, [flickerChance, gridGap, height, maxOpacity, squareSize, width]);

  return (
    <div
      aria-hidden="true"
      className={cn(
        "h-full w-full text-neutral-900 dark:text-neutral-200",
        className,
      )}
      ref={containerRef}
    >
      <canvas className="pointer-events-none block" ref={canvasRef} />
    </div>
  );
}
