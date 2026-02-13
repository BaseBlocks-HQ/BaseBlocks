"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { renderMermaid, THEMES } from "beautiful-mermaid";
import { useTheme } from "next-themes";
import { ZoomIn, ZoomOut, Maximize } from "lucide-react";

interface MermaidDiagramProps {
  code: string;
  /** When true, the diagram stays within its parent container instead of stretching edge-to-edge */
  contained?: boolean;
  /** beautiful-mermaid theme preset key. Unset = auto light/dark. */
  theme?: string;
}

const MIN_SCALE = 0.1;
const MAX_SCALE = 20;
const ZOOM_FACTOR = 0.04;

export function MermaidDiagram({ code, contained, theme }: MermaidDiagramProps) {
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { resolvedTheme } = useTheme();

  const wrapperRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const scaleRef = useRef(1);
  const translateRef = useRef({ x: 0, y: 0 });
  const [renderTick, setRenderTick] = useState(0);
  const dragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });

  const applyTransform = useCallback(() => {
    if (!contentRef.current) return;
    const { x, y } = translateRef.current;
    const s = scaleRef.current;
    contentRef.current.style.transform = `translate(${x}px, ${y}px) scale(${s})`;
  }, []);

  const tick = useCallback(() => setRenderTick((n) => n + 1), []);

  const fitToView = useCallback(() => {
    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || !content) return;

    const svgEl = content.querySelector("svg");
    if (!svgEl) return;

    const viewBox = svgEl.getAttribute("viewBox");
    if (!viewBox) return;

    const parts = viewBox.split(/[\s,]+/).map(Number);
    const svgW = parts[2];
    const svgH = parts[3];
    if (!svgW || !svgH) return;

    const containerW = container.clientWidth;
    const containerH = container.clientHeight;
    const pad = 40;

    // Scale to fit the entire diagram in the container, capped at 4x
    const fitScaleX = (containerW - pad * 2) / svgW;
    const fitScaleY = (containerH - pad * 2) / svgH;
    const s = Math.min(Math.min(fitScaleX, fitScaleY), 4.0);

    // Center the diagram
    const scaledW = svgW * s;
    const scaledH = svgH * s;
    const tx = (containerW - scaledW) / 2;
    const ty = (containerH - scaledH) / 2;

    scaleRef.current = s;
    translateRef.current = { x: tx, y: ty };
    applyTransform();
    tick();
  }, [applyTransform, tick]);

  // Stretch wrapper to fill the nearest scrollable ancestor (the <main> element)
  // Skip when contained (e.g. inside the editor)
  useEffect(() => {
    if (contained) return;

    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const scrollParent =
      wrapper.closest("main") ??
      wrapper.closest("[class*='overflow']") as HTMLElement | null;
    if (!scrollParent) return;

    const update = () => {
      const parentRect = scrollParent.getBoundingClientRect();
      const wrapperParentRect =
        wrapper.parentElement?.getBoundingClientRect() ?? parentRect;

      const offsetLeft = wrapperParentRect.left - parentRect.left;
      wrapper.style.marginLeft = `${-offsetLeft}px`;
      wrapper.style.width = `${scrollParent.clientWidth}px`;
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(scrollParent);
    return () => ro.disconnect();
  }, [svg, contained]);

  useEffect(() => {
    if (!code.trim()) {
      setSvg(null);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    const isDark = resolvedTheme === "dark";
    const preset = theme ? THEMES[theme] : undefined;

    renderMermaid(code, {
      bg: preset?.bg ?? (isDark ? "#09090b" : "#ffffff"),
      fg: preset?.fg ?? (isDark ? "#fafafa" : "#18181b"),
      line: preset?.line,
      accent: preset?.accent,
      muted: preset?.muted,
      surface: preset?.surface,
      border: preset?.border,
      transparent: true,
      nodeSpacing: 60,
      layerSpacing: 80,
      padding: 60,
    })
      .then((result) => {
        if (!cancelled) {
          setSvg(result);
          setError(null);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setSvg(null);
          setError(err instanceof Error ? err.message : "Invalid diagram syntax");
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [code, resolvedTheme, theme]);

  useEffect(() => {
    if (!svg) return;
    requestAnimationFrame(fitToView);
  }, [svg, fitToView]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !svg) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const rect = container.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      const prev = scaleRef.current;
      const factor = e.deltaY > 0 ? 1 - ZOOM_FACTOR : 1 + ZOOM_FACTOR;
      const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, prev * factor));
      const ratio = next / prev;

      translateRef.current = {
        x: mx - ratio * (mx - translateRef.current.x),
        y: my - ratio * (my - translateRef.current.y),
      };
      scaleRef.current = next;
      applyTransform();
      tick();
    };

    container.addEventListener("wheel", onWheel, { passive: false });
    return () => container.removeEventListener("wheel", onWheel);
  }, [svg, applyTransform, tick]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    dragging.current = true;
    lastPos.current = { x: e.clientX, y: e.clientY };
    containerRef.current?.setPointerCapture(e.pointerId);
  }, []);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging.current) return;
      const dx = e.clientX - lastPos.current.x;
      const dy = e.clientY - lastPos.current.y;
      lastPos.current = { x: e.clientX, y: e.clientY };
      translateRef.current = {
        x: translateRef.current.x + dx,
        y: translateRef.current.y + dy,
      };
      applyTransform();
    },
    [applyTransform],
  );

  const handlePointerUp = useCallback(() => {
    dragging.current = false;
  }, []);

  const zoomBy = useCallback(
    (factor: number) => {
      const container = containerRef.current;
      if (!container) return;
      const cx = container.clientWidth / 2;
      const cy = container.clientHeight / 2;
      const prev = scaleRef.current;
      const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, prev * factor));
      const ratio = next / prev;
      translateRef.current = {
        x: cx - ratio * (cx - translateRef.current.x),
        y: cy - ratio * (cy - translateRef.current.y),
      };
      scaleRef.current = next;
      applyTransform();
      tick();
    },
    [applyTransform, tick],
  );

  const canvasHeight = contained ? "h-[300px]" : "h-[75vh]";

  const emptyCanvas = (msg: string) => (
    <div
      ref={wrapperRef}
      className="relative"
    >
      <div className={`flex items-center justify-center ${canvasHeight} text-muted-foreground text-sm border-y border-border bg-muted/30 dark:bg-muted/20`}>
        {msg}
      </div>
    </div>
  );

  if (!code.trim()) return emptyCanvas("No diagram code yet");
  if (loading && !svg) return emptyCanvas("Rendering diagram...");

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive min-h-[200px] flex items-center">
        {error}
      </div>
    );
  }

  if (!svg) return null;

  return (
    <div ref={wrapperRef} className="relative group/diagram">
      {/* Zoom controls */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-1 opacity-0 group-hover/diagram:opacity-100 transition-opacity bg-background/90 backdrop-blur-sm border rounded-lg shadow-sm p-1">
        <button
          type="button"
          onClick={() => zoomBy(1.4)}
          className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"
        >
          <ZoomIn className="h-4 w-4" />
        </button>
        <span className="text-xs text-muted-foreground w-10 text-center tabular-nums select-none">
          {Math.round(scaleRef.current * 100)}%
        </span>
        <button
          type="button"
          onClick={() => zoomBy(1 / 1.4)}
          className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"
        >
          <ZoomOut className="h-4 w-4" />
        </button>
        <div className="w-px h-4 bg-border mx-0.5" />
        <button
          type="button"
          onClick={fitToView}
          className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"
          title="Fit to view"
        >
          <Maximize className="h-4 w-4" />
        </button>
      </div>

      {/* Canvas */}
      <div
        ref={containerRef}
        className={`overflow-hidden ${canvasHeight} border-y border-border cursor-grab active:cursor-grabbing touch-none select-none ${theme ? "" : "bg-muted/30 dark:bg-muted/20"}`}
        style={{
          ...(theme && THEMES[theme] ? { backgroundColor: THEMES[theme].bg } : {}),
          backgroundImage:
            "radial-gradient(circle, hsl(var(--muted-foreground) / 0.15) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <div
          ref={contentRef}
          className="origin-top-left"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      </div>
    </div>
  );
}
