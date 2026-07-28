"use client";

import { useEffect, useRef } from "react";
import { particleColor } from "./particle-color";

const params = {
  canopyY: 0.7,
  strandThickness: 0.018,
  twistFrequency: 4.4,
  waveSpeed: 0.22,
  cursorGlow: 0.3,
  rippleIntensity: 0.14,
  rippleSpeed: 0.14,
  rippleFade: 2.3,
};

interface TrailPoint {
  born: number;
  intensity: number;
  x: number;
  y: number;
}

interface ClickRing {
  born: number;
  x: number;
  y: number;
}

function smoothstep(edge0: number, edge1: number, value: number) {
  const x = Math.max(0, Math.min(1, (value - edge0) / (edge1 - edge0)));
  return x * x * (3 - 2 * x);
}

function randomAt(column: number, row: number) {
  const value = 43_758.5453 * Math.sin(12.9898 * column + 78.233 * row);
  return value - Math.floor(value);
}

export function HeroParticleField() {
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
    let width = 1;
    let height = 1;
    let dpr = 1;
    let raf = 0;
    let visible = false;
    let destroyed = false;
    let pointerX = Number.NaN;
    let pointerY = Number.NaN;
    let pointerInside = false;
    let previousTrailX = 0;
    let previousTrailY = 0;
    let previousTrailTime = -10;
    const trail: TrailPoint[] = [];
    const rings: ClickRing[] = [];
    const startedAt = performance.now();

    function resize() {
      const rect = container.getBoundingClientRect();
      const nextWidth = Math.max(1, Math.round(rect.width));
      const nextHeight = Math.max(1, Math.round(rect.height));
      const nextDpr = Math.max(1, window.devicePixelRatio || 1);
      const bitmapWidth = Math.round(nextWidth * nextDpr);
      const bitmapHeight = Math.round(nextHeight * nextDpr);

      width = nextWidth;
      height = nextHeight;
      dpr = nextDpr;
      if (target.width !== bitmapWidth || target.height !== bitmapHeight) {
        target.width = bitmapWidth;
        target.height = bitmapHeight;
      }
      target.style.width = `${nextWidth}px`;
      target.style.height = `${nextHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      start();
    }

    function addTrail(x: number, y: number, now: number) {
      const edgeFade = smoothstep(0, 0.08, Math.min(x, 1 - x, y, 1 - y));
      trail.push({ born: now, intensity: edgeFade, x, y });
      if (trail.length > 30) trail.shift();
    }

    function onPointerMove(event: PointerEvent) {
      const rect = container.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width;
      const y = (event.clientY - rect.top) / rect.height;
      const now = (performance.now() - startedAt) / 1000;

      if (
        !pointerInside ||
        Math.hypot(x - previousTrailX, y - previousTrailY) >= 0.012 ||
        now - previousTrailTime >= 0.05
      ) {
        addTrail(x, y, now);
        previousTrailX = x;
        previousTrailY = y;
        previousTrailTime = now;
      }

      pointerX = x;
      pointerY = y;
      pointerInside = true;
    }

    function onPointerLeave() {
      pointerInside = false;
      pointerX = Number.NaN;
      pointerY = Number.NaN;
    }

    function onPointerDown(event: PointerEvent) {
      const rect = container.getBoundingClientRect();
      rings.push({
        born: (performance.now() - startedAt) / 1000,
        x: (event.clientX - rect.left) / rect.width,
        y: (event.clientY - rect.top) / rect.height,
      });
      if (rings.length > 3) rings.shift();
    }

    function draw(frameTime: number) {
      raf = 0;
      if (destroyed || !visible) {
        return;
      }

      const time = (frameTime - startedAt) / 1000;
      const dark = document.documentElement.classList.contains("dark");
      const compact = width < 700;
      const spacing = compact ? 6 : 7;
      const dotMin = compact ? 0.18 : 0.2;
      const dotMax = compact ? 3.4 : 4;
      const canopyY = compact ? 0.61 : params.canopyY;
      const strandThickness = compact ? 0.024 : params.strandThickness;
      const minDimension = Math.min(width, height);

      for (let i = trail.length - 1; i >= 0; i -= 1) {
        const point = trail[i];
        if (
          point &&
          Math.exp(-(time - point.born) * params.rippleFade) < 0.005
        ) {
          trail.splice(i, 1);
        }
      }
      for (let i = rings.length - 1; i >= 0; i -= 1) {
        const ring = rings[i];
        if (ring && Math.exp(-2.4 * (time - ring.born)) < 0.005) {
          rings.splice(i, 1);
        }
      }

      ctx.clearRect(0, 0, width, height);

      const columns = Math.ceil(width / spacing) + 1;
      const rows = Math.ceil(height / spacing) + 1;
      const wavePhase = time * params.waveSpeed;
      const strandDenominator = 2 * strandThickness * strandThickness;
      const cursorPx = pointerInside ? pointerX * width : 0;
      const cursorPy = pointerInside ? pointerY * height : 0;
      const cursorSpread = 2 * (0.045 * minDimension) ** 2;
      const rippleWidth = 0.014 * minDimension;
      const rippleWidthSquared = 2 * rippleWidth * rippleWidth;

      for (let row = 0; row < rows; row += 1) {
        const stagger = row % 2 === 0 ? 0 : spacing / 2;
        const y = row * spacing - spacing / 2;
        const normalizedY = y / height;

        for (let column = 0; column < columns; column += 1) {
          const x = column * spacing + stagger - spacing / 2;
          const normalizedX = x / width;
          const shapeX = Math.max(0, Math.min(1, normalizedX));
          const random = randomAt(column, row);
          const arch =
            canopyY -
            (compact ? 0.22 : 0.3) * Math.sin(Math.PI * shapeX) ** 1.35;
          const phase = shapeX * Math.PI * params.twistFrequency + wavePhase;
          const amplitude =
            (compact ? 0.055 : 0.065) *
            (0.72 + 0.28 * Math.sin(Math.PI * shapeX));
          const strandAY = arch + amplitude * Math.sin(phase);
          const strandBY = arch - amplitude * Math.sin(phase);
          const distanceA = normalizedY - strandAY;
          const distanceB = normalizedY - strandBY;
          const depthA = 0.36 + 0.64 * (0.5 + 0.5 * Math.cos(phase));
          const depthB = 0.36 + 0.64 * (0.5 - 0.5 * Math.cos(phase));
          const strandA =
            Math.exp(-(distanceA * distanceA) / strandDenominator) * depthA;
          const strandB =
            Math.exp(-(distanceB * distanceB) / strandDenominator) * depthB;
          const shapeTotal = strandA + strandB;

          let cursor = 0;
          if (pointerInside) {
            const dx = x - cursorPx;
            const dy = y - cursorPy;
            const distanceSquared = dx * dx + dy * dy;
            if (distanceSquared <= 6 * cursorSpread) {
              cursor =
                Math.exp(-distanceSquared / cursorSpread) * params.cursorGlow;
            }
          }

          let ripple = 0;
          for (const point of trail) {
            const age = time - point.born;
            const fade = Math.exp(-age * params.rippleFade);
            const radius = age * params.rippleSpeed * minDimension;
            const distance =
              Math.hypot(x - point.x * width, y - point.y * height) - radius;
            if (Math.abs(distance) < 3 * rippleWidth) {
              ripple +=
                Math.exp(-(distance * distance) / rippleWidthSquared) *
                fade *
                point.intensity;
            }
          }
          ripple = Math.min(1, ripple * params.rippleIntensity);

          let clickRing = 0;
          for (const ring of rings) {
            const age = time - ring.born;
            const fade = Math.exp(-2.4 * age);
            const radius = 0.22 * age * minDimension;
            const distance =
              Math.hypot(x - ring.x * width, y - ring.y * height) - radius;
            const ringWidth = 0.022 * minDimension;
            if (Math.abs(distance) < 3 * ringWidth) {
              clickRing +=
                Math.exp(-(distance * distance) / (2 * ringWidth ** 2)) *
                fade *
                0.32;
            }
          }

          const intensity = Math.min(
            1,
            shapeTotal + cursor + ripple + Math.min(1, clickRing),
          );
          if (intensity < 0.025) continue;

          const radialDistance = Math.hypot(
            normalizedX - 0.5,
            normalizedY - 0.5,
          );
          let highlight = 0.45 * (1 - smoothstep(0, 0.4, radialDistance));
          if (shapeTotal > 0.05) {
            highlight = Math.max(
              highlight,
              0.3 +
                0.28 * Math.abs(normalizedX - 0.5) +
                0.16 * Math.sin(phase - time * 0.16),
            );
          }

          const radius =
            (dotMin + (dotMax - dotMin) * intensity) * (0.65 + 0.35 * random);
          const hueShift =
            shapeTotal > 0.05
              ? 0.6 * Math.sin(3 * normalizedX - 0.22 * time)
              : 0;

          ctx.fillStyle = particleColor(
            intensity,
            dark,
            Math.min(1, highlight),
            hueShift,
          );
          ctx.beginPath();
          ctx.arc(x, y, radius, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      start();
    }

    function start() {
      if (!(destroyed || !visible || raf !== 0)) {
        raf = window.requestAnimationFrame(draw);
      }
    }

    const resizeObserver = new ResizeObserver(resize);
    const intersectionObserver = new IntersectionObserver(
      ([entry]) => {
        visible = entry?.isIntersecting ?? false;
        if (visible) {
          start();
        }
      },
      { threshold: 0 },
    );
    resizeObserver.observe(container);
    intersectionObserver.observe(container);
    container.addEventListener("pointermove", onPointerMove);
    container.addEventListener("pointerleave", onPointerLeave);
    container.addEventListener("pointerdown", onPointerDown);
    resize();

    return () => {
      destroyed = true;
      window.cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      container.removeEventListener("pointermove", onPointerMove);
      container.removeEventListener("pointerleave", onPointerLeave);
      container.removeEventListener("pointerdown", onPointerDown);
    };
  }, []);

  return (
    <div className="landing-hero-particle-field" ref={wrapperRef}>
      <canvas ref={canvasRef} />
    </div>
  );
}
