"use client";

import { cn } from "@baseblocks/ui/lib/utils";
import { useEffect, useRef } from "react";

interface FlickeringGridProps {
  className?: string;
  darkMaxOpacity?: number;
  flickerChance?: number;
  gridGap?: number;
  height?: number;
  lightMaxOpacity?: number;
  squareSize?: number;
  width?: number;
}

interface GridState {
  columns: number;
  dpr: number;
  rows: number;
  squares: Float32Array;
}

// Match the original sparkle cadence while preventing 120/144 Hz displays from
// doubling the work. Only changed squares are repainted at each tick.
const FRAME_INTERVAL_MS = 1000 / 60;
const MAX_DEVICE_PIXEL_RATIO = 2;

function readGridColor(container: HTMLElement) {
  return getComputedStyle(container).color;
}

export function FlickeringGrid({
  className,
  darkMaxOpacity = 0.2,
  flickerChance = 0.25,
  gridGap = 8,
  height,
  lightMaxOpacity = 0.34,
  squareSize = 4,
  width,
}: FlickeringGridProps) {
  "use no memo";
  // Imperative canvas state is intentionally managed outside React. Compiling
  // this component caused React Compiler/Turbopack analysis to take minutes.
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    const context = canvas?.getContext("2d");
    if (!(canvas && container && context)) return;

    let color = readGridColor(container);
    let grid: GridState | null = null;
    let inView = false;
    let timeoutId: number | undefined;
    let lastTick = performance.now();
    let resizeFrameId: number | undefined;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    const maxOpacity = () =>
      document.documentElement.classList.contains("dark")
        ? darkMaxOpacity
        : lightMaxOpacity;

    const drawSquare = (index: number) => {
      if (!grid) return;
      const column = Math.floor(index / grid.rows);
      const row = index % grid.rows;
      const x = column * (squareSize + gridGap) * grid.dpr;
      const y = row * (squareSize + gridGap) * grid.dpr;
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

      // Paint through the far edges instead of leaving a partial grid interval
      // transparent when the container is not an exact multiple of the pitch.
      const columns = Math.ceil(canvasWidth / (squareSize + gridGap)) + 1;
      const rows = Math.ceil(canvasHeight / (squareSize + gridGap)) + 1;
      const opacity = maxOpacity();
      const squares = Float32Array.from(
        { length: columns * rows },
        () => Math.random() * opacity,
      );
      grid = { columns, dpr, rows, squares };
      drawAll();
    };

    const stop = () => {
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
      timeoutId = undefined;
    };

    const tick = () => {
      stop();
      if (!grid || !inView || document.hidden || reducedMotion.matches) {
        return;
      }

      const now = performance.now();
      const deltaTime = Math.min((now - lastTick) / 1000, 0.25);
      lastTick = now;
      const opacity = maxOpacity();

      for (let index = 0; index < grid.squares.length; index++) {
        if (Math.random() < flickerChance * deltaTime) {
          grid.squares[index] = Math.random() * opacity;
          drawSquare(index);
        }
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
      if (resizeFrameId !== undefined) cancelAnimationFrame(resizeFrameId);
      resizeFrameId = requestAnimationFrame(resize);
    });
    resizeObserver.observe(container);

    const intersectionObserver = new IntersectionObserver(([entry]) => {
      inView = entry?.isIntersecting ?? false;
      if (inView) start();
      else stop();
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
      color = readGridColor(container);
      resize();
    });
    themeObserver.observe(document.documentElement, {
      attributeFilter: ["class"],
      attributes: true,
    });

    resize();

    return () => {
      stop();
      if (resizeFrameId !== undefined) cancelAnimationFrame(resizeFrameId);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      themeObserver.disconnect();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      reducedMotion.removeEventListener("change", handleMotionChange);
    };
  }, [
    darkMaxOpacity,
    flickerChance,
    gridGap,
    height,
    lightMaxOpacity,
    squareSize,
    width,
  ]);

  return (
    <div
      aria-hidden="true"
      className={cn(
        "h-full w-full text-neutral-900 dark:text-neutral-200",
        className,
      )}
      ref={containerRef}
    >
      <canvas
        className="pointer-events-none block h-full w-full"
        ref={canvasRef}
      />
    </div>
  );
}
