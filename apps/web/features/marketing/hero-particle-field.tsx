"use client";

import { useEffect, useRef } from "react";
import { particleColor } from "./particle-color";

const params = {
  bowlY: 0.66,
  helixAmp: 0.11,
  thickness: 0.024,
  waveSpeed: 0.5,
  waveDepth: 0.7,
  waveFrequency: 6,
  crossbars: 0.45,
  coreSize: 0.055,
  coreBreathSpeed: 0.85,
  coreBreathDepth: 0.3,
  coreBrightness: 0.6,
  cursorGlow: 0.3,
  floorIntensity: 0.2,
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
      const bowlY = compact ? 0.5 : params.bowlY;
      const helixAmp =
        (compact ? 0.2 : params.helixAmp) *
        (width / height >= 1.5 ? 1 : Math.max(0.55, width / height / 1.5));
      const thickness = compact ? 0.028 : params.thickness;
      const waveFrequency =
        (compact ? 4 : params.waveFrequency) *
        (width / height >= 1.5 ? 1 : Math.max(0.55, width / height / 1.5));
      const waveDepth = compact ? 0.85 : params.waveDepth;
      const crossbars = compact ? 0.65 : params.crossbars;
      const coreSize = compact ? 0.04 : params.coreSize;
      const coreBrightness = compact ? 0.45 : params.coreBrightness;
      const floorIntensity = compact ? 0.14 : params.floorIntensity;
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
      const thicknessSquared = 2 * thickness * thickness;
      const coreSquared = 2 * coreSize * coreSize;
      const breath =
        1 -
        params.coreBreathDepth +
        params.coreBreathDepth *
          (0.5 * Math.sin(time * params.coreBreathSpeed * 2) + 0.5);
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
          const centeredX = normalizedX - 0.5;
          const random = randomAt(column, row);
          const localFrequency =
            waveFrequency * (1 + 0.08 * Math.sin(1.2 * normalizedX));
          const phaseA = normalizedX * localFrequency + wavePhase;
          const phaseB = phaseA + Math.PI;
          const amplitude =
            helixAmp * (1 + 0.18 * Math.sin(2.3 * normalizedX + 0.25 * time));
          const bowl = bowlY - 0.4 * centeredX * centeredX;
          const strandA = bowl + amplitude * Math.sin(phaseA);
          const strandB = bowl + amplitude * Math.sin(phaseB);
          const distanceA = normalizedY - strandA;
          const distanceB = normalizedY - strandB;
          const depthA = (Math.cos(phaseA) + 1) / 2;
          const depthB = (Math.cos(phaseB) + 1) / 2;
          const modulationA =
            (0.65 + 0.35 * Math.sin(4.7 * phaseA + 1.5 * time)) *
            (1 + 0.22 * Math.sin(8 * normalizedX - 1.4 * time));
          const modulationB =
            (0.65 + 0.35 * Math.sin(4.7 * phaseB + 1.5 * time + 1.8)) *
            (1 + 0.22 * Math.sin(8 * normalizedX - 1.4 * time + 2.4));
          const localThickness =
            thicknessSquared *
            (1 + 0.25 * Math.sin(4 * normalizedX - 0.7 * time)) ** 2;
          const strandIntensityA =
            Math.exp(-(distanceA * distanceA) / localThickness) *
            (1 - waveDepth + waveDepth * depthA) *
            modulationA;
          const strandIntensityB =
            Math.exp(-(distanceB * distanceB) / localThickness) *
            (1 - waveDepth + waveDepth * depthB) *
            modulationB;

          let crossbarIntensity = 0;
          if (crossbars > 0) {
            const crossing = Math.exp(-(Math.cos(phaseA) ** 2) * 15);
            const low = Math.min(strandA, strandB);
            const high = Math.max(strandA, strandB);
            if (crossing > 0.04 && normalizedY > low && normalizedY < high) {
              const center = (low + high) / 2;
              const halfHeight = (high - low) / 2;
              if (halfHeight > 0.002) {
                const inside = (normalizedY - center) / halfHeight;
                crossbarIntensity =
                  crossing *
                  (1 - inside * inside) *
                  (0.5 + 0.5 * Math.sin(1.3 * time + 4 * normalizedX)) *
                  crossbars *
                  0.7;
              }
            }
          }

          const centerY = normalizedY - bowlY;
          const coreTexture =
            0.55 +
            0.45 *
              Math.sin(9 * normalizedX + 0.6 * time) *
              Math.cos(8 * normalizedY - 0.4 * time);
          const coreIntensity =
            Math.exp(
              -(centeredX * centeredX + centerY * centerY) / coreSquared,
            ) *
            breath *
            coreBrightness *
            coreTexture;
          const floor =
            Math.exp(-((normalizedY - 0.97) ** 2) / 0.0072) *
            floorIntensity *
            (0.65 + 0.35 * Math.sin(5 * normalizedX + 0.4 * time));

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

          const strandTotal = strandIntensityA + strandIntensityB;
          const intensity = Math.min(
            1,
            strandTotal +
              crossbarIntensity +
              coreIntensity +
              floor +
              cursor +
              ripple +
              Math.min(1, clickRing),
          );
          if (intensity < 0.025) continue;

          const radialDistance = Math.hypot(
            normalizedX - 0.5,
            normalizedY - 0.5,
          );
          let highlight = 0.45 * (1 - smoothstep(0, 0.4, radialDistance));
          if (strandTotal > 0.05) {
            highlight = Math.max(
              highlight,
              0.3 +
                (1 -
                  (depthA * strandIntensityA + depthB * strandIntensityB) /
                    strandTotal) *
                  0.4 +
                0.3 * smoothstep(0, 0.5, Math.abs(normalizedX - 0.5)) +
                0.14 * Math.sin(5 * normalizedX - 0.9 * time),
            );
          }

          const radius =
            (dotMin + (dotMax - dotMin) * intensity) * (0.65 + 0.35 * random);
          const hueShift =
            strandTotal > 0.05
              ? 0.7 * Math.sin(3.5 * normalizedX - 0.6 * time)
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
