"use client";

import { useEffect, useRef } from "react";
import { particleColor } from "./particle-color";

interface RailStructure {
  blendOrigin: readonly [number, number];
  blendRadius: number;
  phase: number;
  phaseB: number;
}

const leftStructure: RailStructure = {
  blendOrigin: [0, 1],
  blendRadius: 1.1,
  phase: 0,
  phaseB: 5.2,
};

const rightStructure: RailStructure = {
  blendOrigin: [1, 1],
  blendRadius: 1.1,
  phase: 3.7,
  phaseB: 1.4,
};

function clamp(value: number) {
  return Math.max(0, Math.min(1, value));
}

function structureValue(x: number, y: number, phase: number) {
  return (
    0.25 * (0.5 * Math.sin(16 * x + 8 * y + 1.6 * phase) + 0.5) +
    0.25 * (0.5 * Math.sin(5 * x - 12 * y + 2 + 1.2 * phase) + 0.5) +
    0.2 * (0.5 * Math.sin((x + y) * 9 + 1.3 + 1.4 * phase) + 0.5) +
    0.15 * (0.5 * Math.cos(7 * x + 14 * y - 0.7 + phase) + 0.5) +
    0.15 * (0.5 * Math.sin((0.4 * x + y) * 7 + 0.8 * phase) + 0.5)
  );
}

function randomAt(column: number, row: number) {
  const value = 43_758.5453 * Math.sin(12.9898 * column + 78.233 * row);
  return value - Math.floor(value);
}

export function StepRailPattern() {
  const leftRef = useRef<HTMLCanvasElement>(null);
  const rightRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const leftCanvas = leftRef.current;
    const rightCanvas = rightRef.current;
    if (!(leftCanvas && rightCanvas)) return;

    const leftContext = leftCanvas.getContext("2d");
    const rightContext = rightCanvas.getContext("2d");
    if (!(leftContext && rightContext)) return;

    const leftTarget = leftCanvas;
    const rightTarget = rightCanvas;
    const leftPainter = leftContext;
    const rightPainter = rightContext;
    const wrapper = leftTarget.parentElement;
    const dpr = Math.min(window.devicePixelRatio, 2);
    let raf = 0;

    function renderRail(
      canvas: HTMLCanvasElement,
      context: CanvasRenderingContext2D,
      structure: RailStructure,
    ) {
      const rect = canvas.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;
      const dark = document.documentElement.classList.contains("dark");
      const spacing = 7;
      const columns = Math.ceil(width / spacing) + 1;
      const rows = Math.ceil(height / spacing) + 1;
      const radiusSquared = structure.blendRadius ** 2;

      const bitmapWidth = Math.max(1, Math.round(width * dpr));
      const bitmapHeight = Math.max(1, Math.round(height * dpr));
      if (canvas.width !== bitmapWidth || canvas.height !== bitmapHeight) {
        canvas.width = bitmapWidth;
        canvas.height = bitmapHeight;
      }

      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.clearRect(0, 0, width, height);

      for (let row = 0; row < rows; row += 1) {
        const stagger = row % 2 === 0 ? 0 : spacing / 2;
        const y = spacing * row - spacing / 2;
        const normalizedY = y / Math.max(height, 1);

        for (let column = 0; column < columns; column += 1) {
          const x = spacing * column + stagger - spacing / 2;
          const normalizedX = x / Math.max(width, 1);
          const deltaX = normalizedX - structure.blendOrigin[0];
          const deltaY = normalizedY - structure.blendOrigin[1];
          const distanceSquared = deltaX ** 2 + deltaY ** 2;
          const blendDistance =
            distanceSquared >= radiusSquared
              ? 1
              : Math.sqrt(distanceSquared) / structure.blendRadius;
          const phaseAWeight = 1 - blendDistance ** 2 * (3 - 2 * blendDistance);
          const phaseBWeight = 1 - phaseAWeight;
          const structured =
            structureValue(normalizedX, normalizedY, structure.phase) *
              phaseAWeight +
            structureValue(normalizedX, normalizedY, structure.phaseB) *
              phaseBWeight;
          const horizontalFade =
            1 - 0.4 * (2 * Math.abs(normalizedX - 0.5)) ** 2;
          const intensity = clamp(structured * horizontalFade * 0.55 * 1.1);

          if (intensity < 0.025) continue;

          const random = randomAt(column, row);
          const radius = Math.max(
            (0.2 + 3.8 * intensity) * (0.65 + 0.35 * random),
            0.5 / dpr,
          );

          context.beginPath();
          context.fillStyle = particleColor(intensity, dark);
          context.arc(x, y, radius, 0, Math.PI * 2);
          context.fill();
        }
      }
    }

    function render() {
      raf = 0;
      renderRail(leftTarget, leftPainter, leftStructure);
      renderRail(rightTarget, rightPainter, rightStructure);
    }

    function scheduleRender() {
      if (raf === 0) raf = window.requestAnimationFrame(render);
    }

    const resizeObserver = new ResizeObserver(scheduleRender);
    if (wrapper) resizeObserver.observe(wrapper);
    const themeObserver = new MutationObserver(scheduleRender);
    themeObserver.observe(document.documentElement, {
      attributeFilter: ["class"],
      attributes: true,
    });
    scheduleRender();

    return () => {
      window.cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      themeObserver.disconnect();
    };
  }, []);

  return (
    <div className="landing-step-rail-pattern">
      <canvas ref={leftRef} />
      <canvas ref={rightRef} />
    </div>
  );
}
