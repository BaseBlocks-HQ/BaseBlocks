"use client";

import { useEffect, useRef, type RefObject } from "react";
import { particleColor } from "./particle-color";

const contourPadding = [28, 58, 88, 118] as const;
const contourAmplitude = [6, 8, 10, 12] as const;
const contourFrequency = [3, 5, 7, 11] as const;
const contourPhase = [0, 1.3, 2.6, 0.7] as const;
const contourIntensity = [0.4, 0.34, 0.28, 0.2] as const;

function randomAt(column: number, row: number) {
  const value = 43_758.5453 * Math.sin(12.9898 * column + 78.233 * row);
  return value - Math.floor(value);
}

function smoothstep(value: number) {
  const progress = Math.max(0, Math.min(1, value));
  return progress * progress * (3 - 2 * progress);
}

type ParticlePulse = {
  bornAt: number;
  intensity: number;
  x: number;
  y: number;
};

export function EditorParticleField({
  contourRef,
  lightModeContrast = 1,
  shape = "rings",
}: {
  contourRef: RefObject<HTMLDivElement | null>;
  lightModeContrast?: number;
  shape?: "masses" | "rings";
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const contour = contourRef.current;
    const context = canvas?.getContext("2d");
    if (!(canvas && contour && context)) return;

    const target = canvas;
    const ctx = context;
    const spacing = 7;
    let width = 1;
    let height = 1;
    let dpr = 1;
    let columns = 1;
    let rows = 1;
    let field = new Float32Array(1);
    let frame = 0;
    let pointerX = Number.NaN;
    let pointerY = Number.NaN;
    let pointerActive = false;
    let previousTrailX = Number.NaN;
    let previousTrailY = Number.NaN;
    let previousTrailAt = 0;
    let trail: ParticlePulse[] = [];
    let clicks: ParticlePulse[] = [];

    const edgeFactor = (x: number, y: number) => {
      const canvasEdge = Math.min(x, 1 - x, y, 1 - y);
      const editorEdge = Math.abs(y - 0.87);
      return smoothstep(Math.min(canvasEdge, editorEdge) / 0.08);
    };

    const draw = (now: number) => {
      frame = 0;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      const dark = document.documentElement.classList.contains("dark");
      const edgeFade = 0.08 * Math.min(width, height);
      const minimumDimension = Math.min(width, height);
      const cursorSpread = 2 * (0.045 * minimumDimension) ** 2;
      const trailSpeed = 0.14 * minimumDimension;
      const trailWidth = 0.014 * minimumDimension;
      const trailDenominator = 2 * trailWidth ** 2;
      const clickWidth = 0.022 * minimumDimension;
      const clickDenominator = 2 * clickWidth ** 2;

      trail = trail.filter((pulse) => now - pulse.bornAt < 1900);
      clicks = clicks.filter((pulse) => now - pulse.bornAt < 2100);

      for (let row = 0; row < rows; row++) {
        const stagger = row % 2 === 0 ? 0 : spacing / 2;
        const y = spacing * row - spacing / 2;

        for (let column = 0; column < columns; column++) {
          const x = spacing * column + stagger - spacing / 2;
          let interaction = 0;

          if (pointerActive) {
            const distanceSquared = (x - pointerX) ** 2 + (y - pointerY) ** 2;
            interaction +=
              0.4 *
              Math.exp(-distanceSquared / cursorSpread) *
              edgeFactor(x / width, y / height);
          }

          for (const pulse of trail) {
            const age = (now - pulse.bornAt) / 1000;
            const distance = Math.hypot(x - pulse.x, y - pulse.y);
            const outerRadius = age * trailSpeed;
            const innerRadius = Math.max(0, age - 0.18) * trailSpeed;
            const fade = Math.exp(-2.3 * age);
            const outer =
              Math.exp(-((distance - outerRadius) ** 2) / trailDenominator) *
              fade;
            const inner =
              Math.exp(-((distance - innerRadius) ** 2) / trailDenominator) *
              fade *
              0.5;
            interaction +=
              (outer + inner) *
              0.25 *
              pulse.intensity *
              edgeFactor(x / width, y / height);
          }

          for (const pulse of clicks) {
            const age = (now - pulse.bornAt) / 1000;
            const radius = 0.22 * age * minimumDimension;
            const distance = Math.hypot(x - pulse.x, y - pulse.y);
            if (Math.abs(distance - radius) > 3 * clickWidth) continue;
            interaction +=
              Math.exp(-((distance - radius) ** 2) / clickDenominator) *
              Math.exp(-2.4 * age) *
              0.4 *
              pulse.intensity *
              edgeFactor(x / width, y / height);
          }

          let intensity = Math.min(
            1,
            (field[row * columns + column] ?? 0) + interaction,
          );
          const distanceToEdge = Math.min(x, width - x, y, height - y);

          if (distanceToEdge < edgeFade) {
            intensity *= smoothstep(distanceToEdge / edgeFade);
          }

          if (intensity < 0.025) continue;
          const radius = Math.max(
            (0.2 + 3.8 * intensity) * (0.65 + 0.35 * randomAt(column, row)),
            0.5 / dpr,
          );

          const colorIntensity = dark
            ? intensity
            : Math.min(1, intensity * lightModeContrast);
          const highlight = dark ? 0.4 : 0.4 / lightModeContrast;
          ctx.fillStyle = particleColor(colorIntensity, dark, highlight);
          ctx.beginPath();
          ctx.arc(x, y, radius, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      if (pointerActive || trail.length > 0 || clicks.length > 0) {
        frame = window.requestAnimationFrame(draw);
      }
    };

    const scheduleDraw = () => {
      if (!frame) frame = window.requestAnimationFrame(draw);
    };

    const rebuild = () => {
      const canvasRect = target.getBoundingClientRect();
      const contourRect = contour.getBoundingClientRect();
      width = Math.max(1, Math.round(canvasRect.width));
      height = Math.max(1, Math.round(canvasRect.height));
      dpr = Math.max(1, window.devicePixelRatio || 1);
      const bitmapWidth = Math.round(width * dpr);
      const bitmapHeight = Math.round(height * dpr);

      if (target.width !== bitmapWidth || target.height !== bitmapHeight) {
        target.width = bitmapWidth;
        target.height = bitmapHeight;
      }

      columns = Math.ceil(width / spacing) + 1;
      rows = Math.ceil(height / spacing) + 1;
      field = new Float32Array(columns * rows);
      const left = contourRect.left - canvasRect.left;
      const top = contourRect.top - canvasRect.top;
      const right = contourRect.right - canvasRect.left;
      const bottom = contourRect.bottom - canvasRect.top;
      const centerX = (left + right) / 2;
      const centerY = (top + bottom) / 2;
      const halfWidth = (right - left) / 2;
      const halfHeight = (bottom - top) / 2;

      if (shape === "masses") {
        const massHeight = Math.max(1, height);

        for (let row = 0; row < rows; row++) {
          const stagger = row % 2 === 0 ? 0 : spacing / 2;
          const gridY = spacing * row - spacing / 2;
          const progress = gridY / massHeight;
          const verticalFade =
            smoothstep((progress + 0.02) / 0.1) *
            smoothstep((1.02 - progress) / 0.1);

          if (verticalFade <= 0) continue;

          for (let column = 0; column < columns; column++) {
            const gridX = spacing * column + stagger - spacing / 2;
            const side = gridX < left ? -1 : gridX > right ? 1 : 0;
            if (side === 0) continue;

            const outwardDistance = side < 0 ? left - gridX : gridX - right;
            const centerProgress = side < 0 ? 0.37 : 0.64;
            const progressDistance =
              (progress - centerProgress) / (side < 0 ? 0.67 : 0.54);
            const availableWidth = side < 0 ? left : width - right;
            const maximumReach =
              side < 0
                ? Math.max(176, availableWidth * 1.04)
                : Math.max(150, availableWidth * 1.04);
            const reach =
              maximumReach *
                Math.max(0, 1 - progressDistance * progressDistance) +
              (side < 0 ? 8 : 18) * (progress - 0.5);
            const interior = smoothstep((reach - outwardDistance) / 34);
            const texture =
              0.28 +
              0.38 *
                (0.5 +
                  0.5 *
                    Math.sin(
                      gridX * 0.031 + gridY * 0.014 + (side < 0 ? 0.4 : 2.2),
                    )) +
              0.34 *
                (0.5 +
                  0.5 *
                    Math.cos(
                      gridX * 0.012 - gridY * 0.026 + (side < 0 ? 1.3 : -0.7),
                    ));
            const edgeDistance = outwardDistance - reach;
            const tornEdge =
              Math.exp(-(edgeDistance * edgeDistance) / 240) * 0.26;
            const voidProgress = side < 0 ? 0.3 : 0.7;
            const voidOutward = side < 0 ? 76 : 54;
            const voidDistance =
              ((outwardDistance - voidOutward) / (side < 0 ? 44 : 33)) ** 2 +
              ((progress - voidProgress) / (side < 0 ? 0.095 : 0.13)) ** 2;
            const carvedVoid = Math.exp(-voidDistance * 1.5);
            const value =
              Math.max(0, interior * texture + tornEdge - carvedVoid * 0.68) *
              verticalFade;

            field[row * columns + column] = Math.min(1, value);
          }
        }

        scheduleDraw();
        return;
      }

      for (let ringIndex = 0; ringIndex < contourPadding.length; ringIndex++) {
        const padding = contourPadding[ringIndex] ?? 0;
        const amplitude = contourAmplitude[ringIndex] ?? 0;
        const frequency = contourFrequency[ringIndex] ?? 0;
        const phase = contourPhase[ringIndex] ?? 0;
        const intensity = contourIntensity[ringIndex] ?? 0;
        const radiusX = halfWidth + padding;
        const radiusY = halfHeight + padding;
        const eccentricity = ((radiusX - radiusY) / (radiusX + radiusY)) ** 2;
        const circumference =
          Math.PI *
          (radiusX + radiusY) *
          (1 +
            (3 * eccentricity) /
              (10 + Math.sqrt(Math.max(0, 4 - 3 * eccentricity))));
        const samples = Math.max(8, Math.floor(circumference / 9));

        for (let sample = 0; sample < samples; sample++) {
          if (randomAt(sample, ringIndex) < 0.12) continue;

          const angle = (sample / samples) * Math.PI * 2;
          const wave = amplitude * Math.sin(frequency * angle + phase);
          const pointX = centerX + (radiusX + wave) * Math.cos(angle);
          const pointY = centerY + (radiusY + wave) * Math.sin(angle);

          if (
            (pointX >= left &&
              pointX <= right &&
              pointY >= top &&
              pointY <= bottom) ||
            pointX < -9 ||
            pointX > width + 9 ||
            pointY < -9 ||
            pointY > height + 9
          ) {
            continue;
          }

          const variation = randomAt(sample * 7, ringIndex * 3);
          const pointIntensity = intensity * (0.78 + 0.44 * variation);
          const centerRow = Math.round((pointY + spacing / 2) / spacing);

          for (let rowOffset = -1; rowOffset <= 1; rowOffset++) {
            const row = centerRow + rowOffset;
            if (row < 0 || row >= rows) continue;
            const stagger = row % 2 === 0 ? 0 : spacing / 2;
            const gridY = spacing * row - spacing / 2;
            const centerColumn = Math.round(
              (pointX - stagger + spacing / 2) / spacing,
            );

            for (let columnOffset = -1; columnOffset <= 1; columnOffset++) {
              const column = centerColumn + columnOffset;
              if (column < 0 || column >= columns) continue;
              const gridX = spacing * column + stagger - spacing / 2;
              const distanceSquared =
                (gridX - pointX) ** 2 + (gridY - pointY) ** 2;
              if (distanceSquared > 81) continue;

              const value = Math.exp(-distanceSquared / 25.92) * pointIntensity;
              const index = row * columns + column;
              if (value > (field[index] ?? 0)) field[index] = value;
            }
          }
        }
      }

      scheduleDraw();
    };

    const pointerPosition = (event: PointerEvent) => {
      const canvasRect = target.getBoundingClientRect();
      const contourRect = contour.getBoundingClientRect();
      const x = event.clientX - canvasRect.left;
      const y = event.clientY - canvasRect.top;
      const contourBottom = contourRect.bottom - canvasRect.top;
      const interactionBottom =
        shape === "masses" ? canvasRect.height : contourBottom;

      if (
        x < 0 ||
        x > canvasRect.width ||
        y < 0 ||
        y > canvasRect.height ||
        y >= interactionBottom
      ) {
        pointerActive = false;
        scheduleDraw();
        return null;
      }

      return { x, y };
    };

    const onPointerMove = (event: PointerEvent) => {
      const position = pointerPosition(event);
      if (!position) return;

      const now = performance.now();
      pointerX = position.x;
      pointerY = position.y;
      pointerActive = true;

      const normalizedDistance = Number.isNaN(previousTrailX)
        ? Number.POSITIVE_INFINITY
        : Math.hypot(position.x - previousTrailX, position.y - previousTrailY) /
          Math.min(width, height);

      if (
        normalizedDistance >= 0.012 ||
        now - previousTrailAt >= 50 ||
        trail.length === 0
      ) {
        trail.push({
          bornAt: now,
          intensity: 1,
          x: position.x,
          y: position.y,
        });
        if (trail.length > 30) trail = trail.slice(-30);
        previousTrailX = position.x;
        previousTrailY = position.y;
        previousTrailAt = now;
      }

      scheduleDraw();
    };

    const onPointerDown = (event: PointerEvent) => {
      const position = pointerPosition(event);
      if (!position) return;

      clicks.push({
        bornAt: performance.now(),
        intensity: 1,
        x: position.x,
        y: position.y,
      });
      if (clicks.length > 3) clicks = clicks.slice(-3);
      scheduleDraw();
    };

    const onPointerLeave = () => {
      pointerActive = false;
      scheduleDraw();
    };

    const resizeObserver = new ResizeObserver(rebuild);
    const themeObserver = new MutationObserver(scheduleDraw);
    resizeObserver.observe(target);
    resizeObserver.observe(contour);
    themeObserver.observe(document.documentElement, {
      attributeFilter: ["class"],
      attributes: true,
    });
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerdown", onPointerDown, { passive: true });
    window.addEventListener("blur", onPointerLeave);
    document.addEventListener("mouseleave", onPointerLeave);
    rebuild();

    return () => {
      window.cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      themeObserver.disconnect();
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("blur", onPointerLeave);
      document.removeEventListener("mouseleave", onPointerLeave);
    };
  }, [contourRef, lightModeContrast, shape]);

  return <canvas className="landing-editor-particle-field" ref={canvasRef} />;
}
