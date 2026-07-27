"use client";

import { useEffect, useRef } from "react";
import { particleColor } from "./particle-color";

interface RailHalftoneProps {
  blendOrigin: readonly [number, number];
  blendRadius: number;
  phase: number;
  phaseB: number;
}

interface TrailPoint {
  born: number;
  intensity: number;
  x: number;
  y: number;
}

interface ClickRing {
  born: number;
  intensity: number;
  x: number;
  y: number;
}

const spacing = 7;
const leftBlendOrigin = [0, 1] as const;
const rightBlendOrigin = [1, 1] as const;

function smoothstep(edge0: number, edge1: number, value: number) {
  const ratio = Math.max(0, Math.min(1, (value - edge0) / (edge1 - edge0)));
  return ratio * ratio * (3 - 2 * ratio);
}

function randomAt(column: number, row: number) {
  const value = 43_758.5453 * Math.sin(12.9898 * column + 78.233 * row);
  return value - Math.floor(value);
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

function RailHalftone({
  blendOrigin,
  blendRadius,
  phase,
  phaseB,
}: RailHalftoneProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!(wrapper && canvas && context)) return;

    const container = wrapper;
    const target = canvas;
    const ctx = context;
    let width = 0;
    let height = 0;
    let dpr = 1;
    let structure: Float32Array | null = null;
    let structureColumns = 0;
    let visible = true;
    let pointerInside = false;
    let pointerX = Number.NaN;
    let pointerY = Number.NaN;
    let previousX = 0;
    let previousY = 0;
    let previousTime = -10;
    let cachedRect: DOMRect | null = null;
    let raf = 0;
    let destroyed = false;
    let dirty = true;
    const trails: TrailPoint[] = [];
    const rings: ClickRing[] = [];
    const startedAt = performance.now();

    function pointerEdgeIntensity(x: number, y: number) {
      return smoothstep(0, 0.08, Math.min(x, 1 - x, y, 1 - y));
    }

    function addTrail(x: number, y: number, now: number) {
      trails.push({
        born: now,
        intensity: pointerEdgeIntensity(x, y),
        x,
        y,
      });
      if (trails.length > 30) trails.shift();
    }

    function schedule() {
      if (!(destroyed || !visible || raf !== 0)) {
        raf = window.requestAnimationFrame(draw);
      }
    }

    function resize() {
      const rect = container.getBoundingClientRect();
      const nextWidth = Math.max(1, Math.round(rect.width));
      const nextHeight = Math.max(1, Math.round(rect.height));
      if (nextWidth === width && nextHeight === height) return;

      width = nextWidth;
      height = nextHeight;
      dpr = Math.max(1, window.devicePixelRatio || 1);
      target.width = Math.round(width * dpr);
      target.height = Math.round(height * dpr);
      target.style.width = `${width}px`;
      target.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const columns = Math.ceil(width / spacing) + 1;
      const rows = Math.ceil(height / spacing) + 1;
      const values = new Float32Array(columns * rows);
      const radiusSquared = blendRadius * blendRadius;

      for (let row = 0; row < rows; row += 1) {
        const stagger = row % 2 === 0 ? 0 : spacing / 2;
        const normalizedY = (spacing * row - spacing / 2) / height;

        for (let column = 0; column < columns; column += 1) {
          const normalizedX =
            (spacing * column + stagger - spacing / 2) / width;
          const deltaX = normalizedX - blendOrigin[0];
          const deltaY = normalizedY - blendOrigin[1];
          const distanceSquared = deltaX * deltaX + deltaY * deltaY;
          const distance =
            distanceSquared >= radiusSquared
              ? 1
              : Math.sqrt(distanceSquared) / blendRadius;
          const phaseBWeight = 1 - distance * distance * (3 - 2 * distance);
          const phaseWeight = 1 - phaseBWeight;
          const value =
            structureValue(normalizedX, normalizedY, phase) * phaseWeight +
            structureValue(normalizedX, normalizedY, phaseB) * phaseBWeight;
          const horizontalFade =
            1 - 0.4 * (2 * Math.abs(normalizedX - 0.5)) ** 2;

          values[row * columns + column] = Math.max(
            0,
            Math.min(1, value * horizontalFade * 0.55),
          );
        }
      }

      structure = values;
      structureColumns = columns;
      dirty = true;
      schedule();
    }

    function onPointerMove(event: PointerEvent) {
      const rect =
        pointerInside && cachedRect
          ? cachedRect
          : container.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      const x = (event.clientX - rect.left) / rect.width;
      const y = (event.clientY - rect.top) / rect.height;
      const isInside = x >= 0 && x <= 1 && y >= 0 && y <= 1;

      if (!isInside) {
        if (pointerInside) {
          pointerInside = false;
          pointerX = Number.NaN;
          pointerY = Number.NaN;
          cachedRect = null;
          dirty = true;
          schedule();
        }
        return;
      }

      if (!pointerInside) cachedRect = rect;
      const now = (performance.now() - startedAt) / 1000;
      if (
        !pointerInside ||
        Math.hypot(x - previousX, y - previousY) >= 0.012 ||
        now - previousTime >= 0.05
      ) {
        addTrail(x, y, now);
        previousX = x;
        previousY = y;
        previousTime = now;
      }

      pointerX = x;
      pointerY = y;
      pointerInside = true;
      dirty = true;
      schedule();
    }

    function onPointerDown(event: PointerEvent) {
      const rect = container.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      const x = (event.clientX - rect.left) / rect.width;
      const y = (event.clientY - rect.top) / rect.height;
      if (x < 0 || x > 1 || y < 0 || y > 1) return;

      rings.push({
        born: (performance.now() - startedAt) / 1000,
        intensity: pointerEdgeIntensity(x, y),
        x,
        y,
      });
      if (rings.length > 3) rings.shift();
      dirty = true;
      schedule();
    }

    function draw(frameTime: number) {
      raf = 0;
      if (destroyed || !visible) return;

      const time = (frameTime - startedAt) / 1000;
      let trailLength = 0;
      for (const trail of trails) {
        if (Math.exp(-2.3 * (time - trail.born)) > 0.005) {
          trails[trailLength] = trail;
          trailLength += 1;
        }
      }
      trails.length = trailLength;

      let ringLength = 0;
      for (const ring of rings) {
        if (Math.exp(-2.4 * (time - ring.born)) > 0.005) {
          rings[ringLength] = ring;
          ringLength += 1;
        }
      }
      rings.length = ringLength;

      const interactive =
        pointerInside || trails.length > 0 || rings.length > 0;
      if (!(interactive || dirty)) return;
      dirty = interactive;

      ctx.clearRect(0, 0, width, height);
      const columns = Math.ceil(width / spacing) + 1;
      const rows = Math.ceil(height / spacing) + 1;
      const minDimension = Math.min(width, height);
      const pointerPx = pointerInside ? pointerX * width : 0;
      const pointerPy = pointerInside ? pointerY * height : 0;
      const pointerSpread = 2 * (0.045 * minDimension) ** 2;
      const trailWidth = 0.014 * minDimension;
      const trailWidthSquared = 2 * trailWidth * trailWidth;
      const ringWidth = 0.022 * minDimension;
      const ringWidthSquared = 2 * ringWidth * ringWidth;
      const dark = document.documentElement.classList.contains("dark");

      for (let row = 0; row < rows; row += 1) {
        const stagger = row % 2 === 0 ? 0 : spacing / 2;
        const y = spacing * row - spacing / 2;

        for (let column = 0; column < columns; column += 1) {
          const x = spacing * column + stagger - spacing / 2;
          let pointerGlow = 0;

          if (pointerInside) {
            const deltaX = x - pointerPx;
            const deltaY = y - pointerPy;
            const distanceSquared = deltaX * deltaX + deltaY * deltaY;
            if (distanceSquared <= 6 * pointerSpread) {
              pointerGlow =
                0.4 *
                Math.exp(-distanceSquared / pointerSpread) *
                pointerEdgeIntensity(pointerX, pointerY);
            }
          }

          let ripple = 0;
          for (const trail of trails) {
            const age = time - trail.born;
            const fade = Math.exp(-2.3 * age);
            const distanceToOrigin = Math.hypot(
              x - trail.x * width,
              y - trail.y * height,
            );
            const firstDistance = distanceToOrigin - age * 0.14 * minDimension;
            if (Math.abs(firstDistance) < 3 * trailWidth) {
              ripple +=
                Math.exp(-(firstDistance * firstDistance) / trailWidthSquared) *
                fade *
                trail.intensity;
            }

            const secondRadius = Math.max(0, age - 0.18) * 0.14 * minDimension;
            if (secondRadius > 0) {
              const secondDistance = distanceToOrigin - secondRadius;
              if (Math.abs(secondDistance) < 3 * trailWidth) {
                ripple +=
                  Math.exp(
                    -(secondDistance * secondDistance) /
                      (1.25 * trailWidthSquared),
                  ) *
                  fade *
                  trail.intensity *
                  0.5;
              }
            }
          }
          ripple = Math.min(1, ripple * 0.25);

          let clickRing = 0;
          for (const ring of rings) {
            const age = time - ring.born;
            const fade = Math.exp(-2.4 * age);
            const distance =
              Math.hypot(x - ring.x * width, y - ring.y * height) -
              0.22 * age * minDimension;
            if (Math.abs(distance) < 3 * ringWidth) {
              clickRing +=
                Math.exp(-(distance * distance) / ringWidthSquared) *
                fade *
                0.4 *
                ring.intensity;
            }
          }
          clickRing = Math.min(1, clickRing);

          const base = structure?.[row * structureColumns + column] ?? 0;
          const intensity = Math.min(
            1,
            pointerGlow + ripple + clickRing + base,
          );
          if (intensity < 0.025) continue;

          const radius = Math.max(
            (0.2 + 3.8 * intensity) * (0.65 + 0.35 * randomAt(column, row)),
            0.5 / dpr,
          );
          ctx.fillStyle = particleColor(intensity, dark, 0.4);
          ctx.beginPath();
          ctx.arc(x, y, radius, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      if (interactive) schedule();
    }

    const resizeObserver = new ResizeObserver(resize);
    const intersectionObserver = new IntersectionObserver(
      ([entry]) => {
        const wasVisible = visible;
        visible = entry?.isIntersecting ?? false;
        if (!visible && wasVisible) {
          pointerInside = false;
          pointerX = Number.NaN;
          pointerY = Number.NaN;
          cachedRect = null;
          trails.length = 0;
          rings.length = 0;
          if (raf !== 0) {
            window.cancelAnimationFrame(raf);
            raf = 0;
          }
        } else if (visible && !wasVisible) {
          dirty = true;
          schedule();
        }
      },
      { threshold: 0 },
    );
    const themeObserver = new MutationObserver(() => {
      dirty = true;
      schedule();
    });

    resizeObserver.observe(container);
    intersectionObserver.observe(container);
    themeObserver.observe(document.documentElement, {
      attributeFilter: ["class"],
      attributes: true,
    });
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerdown", onPointerDown, { passive: true });
    resize();
    schedule();

    return () => {
      destroyed = true;
      window.cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      themeObserver.disconnect();
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerdown", onPointerDown);
    };
  }, [blendOrigin, blendRadius, phase, phaseB]);

  return (
    <div className="landing-step-rail-halftone" ref={wrapperRef}>
      <canvas ref={canvasRef} />
    </div>
  );
}

export function StepRailPattern() {
  return (
    <div aria-hidden="true" className="landing-step-rail-pattern">
      <RailHalftone
        blendOrigin={leftBlendOrigin}
        blendRadius={1.1}
        phase={0}
        phaseB={5.2}
      />
      <RailHalftone
        blendOrigin={rightBlendOrigin}
        blendRadius={1.1}
        phase={3.7}
        phaseB={1.4}
      />
    </div>
  );
}
