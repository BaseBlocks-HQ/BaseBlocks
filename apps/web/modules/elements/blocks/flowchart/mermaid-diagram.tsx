"use client";

import { cn } from "@/lib/utils";
import { THEMES, renderMermaidSVG } from "beautiful-mermaid";
import DOMPurify from "dompurify";
import {
  AlertCircle,
  LocateFixed,
  Maximize2,
  Minimize2,
  Workflow,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

interface MermaidDiagramProps {
  code: string;
  /** When true, the diagram stays within its parent container instead of stretching edge-to-edge */
  contained?: boolean;
  /** When true, the canvas fills its parent height instead of using a fixed contained height. */
  fillHeight?: boolean;
  /** When true, render without an extra inner frame because the parent already provides one. */
  embedded?: boolean;
  /** beautiful-mermaid theme preset key. Unset = auto light/dark. */
  theme?: string;
}

const MIN_SCALE = 0.1;
const MAX_SCALE = 20;
const ZOOM_FACTOR = 0.04;

function renderMermaidSvg(
  code: string,
  resolvedTheme: string,
  theme: string | undefined,
) {
  const isDark = resolvedTheme === "dark";
  const preset = theme ? THEMES[theme] : undefined;

  return renderMermaidSVG(code, {
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
  });
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  if (error && typeof error === "object" && "message" in error) {
    const message = error.message;
    if (typeof message === "string") {
      return message;
    }
  }

  return "Invalid diagram syntax";
}

export function MermaidDiagram({
  code,
  contained,
  fillHeight = false,
  embedded = false,
  theme,
}: MermaidDiagramProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { resolvedTheme } = useTheme();
  const renderState = useMemo(() => {
    const trimmedCode = code.trim();
    if (!trimmedCode) {
      return { svg: null, errorMessage: null };
    }

    try {
      return {
        svg: renderMermaidSvg(trimmedCode, resolvedTheme ?? "light", theme),
        errorMessage: null,
      };
    } catch (error) {
      return {
        svg: null,
        errorMessage: getErrorMessage(error),
      };
    }
  }, [code, resolvedTheme, theme]);
  const svg = renderState.svg;
  const errorMessage = renderState.errorMessage;

  const wrapperRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const scaleRef = useRef(1);
  const translateRef = useRef({ x: 0, y: 0 });
  const [displayScale, setDisplayScale] = useState(1);
  const dragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });

  const applyTransform = useCallback(() => {
    if (!contentRef.current) return;
    const { x, y } = translateRef.current;
    const s = scaleRef.current;
    contentRef.current.style.transform = `translate(${x}px, ${y}px) scale(${s})`;
  }, []);

  const tick = useCallback(() => setDisplayScale(scaleRef.current), []);

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

  // Always keep the diagram constrained to its parent container width.
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    wrapper.style.marginLeft = "";
    wrapper.style.width = "";
  }, []);

  useEffect(() => {
    if (!svg) return;
    requestAnimationFrame(fitToView);
  }, [svg, fitToView]);

  useEffect(() => {
    if (!contentRef.current) return;
    contentRef.current.innerHTML = DOMPurify.sanitize(svg ?? "", {
      USE_PROFILES: { svg: true, svgFilters: true },
      ADD_TAGS: ["foreignObject"],
    });
  }, [svg]);

  useEffect(() => {
    if (!isFullscreen) return;
    requestAnimationFrame(fitToView);
  }, [isFullscreen, fitToView]);

  useEffect(() => {
    if (!isFullscreen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsFullscreen(false);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isFullscreen]);

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const container = containerRef.current;
    if (!container || !svg) return;

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

  const handlePointerDown = (e: React.PointerEvent) => {
    dragging.current = true;
    lastPos.current = { x: e.clientX, y: e.clientY };
    containerRef.current?.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    const dx = e.clientX - lastPos.current.x;
    const dy = e.clientY - lastPos.current.y;
    lastPos.current = { x: e.clientX, y: e.clientY };
    translateRef.current = {
      x: translateRef.current.x + dx,
      y: translateRef.current.y + dy,
    };
    applyTransform();
  };

  const handlePointerUp = () => {
    dragging.current = false;
  };

  const zoomBy = (factor: number) => {
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
  };

  const canvasHeight = isFullscreen
    ? "h-[calc(100vh-4rem)]"
    : fillHeight
      ? "h-full"
      : contained
        ? "h-[240px] md:h-[300px]"
        : "h-[75vh]";

  const emptyCanvas = (msg: string) => (
    <div
      ref={wrapperRef}
      className={cn(
        "relative w-full max-w-full min-w-0",
        fillHeight && "h-full",
      )}
    >
      <div
        className={cn(
          `flex flex-col items-center justify-center gap-3 ${canvasHeight} px-6 text-center`,
          embedded
            ? "bg-transparent"
            : "rounded-[18px] border border-border/60 bg-muted/25 dark:bg-muted/15",
        )}
      >
        <div className="flex size-10 items-center justify-center rounded-full bg-background/80 shadow-xs">
          <Workflow className="size-4 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">{msg}</p>
      </div>
    </div>
  );

  if (!code.trim()) return emptyCanvas("Write Mermaid code to preview it");

  if (errorMessage) {
    return (
      <div
        className={cn(
          "flex items-center justify-center px-6 text-center",
          fillHeight ? "h-full" : "min-h-[200px]",
          embedded
            ? "bg-transparent"
            : "rounded-[18px] border border-destructive/20 bg-destructive/[0.035]",
        )}
      >
        <div className="flex max-w-[22rem] flex-col items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-full bg-destructive/8">
            <AlertCircle className="size-4 text-destructive" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">
              Diagram syntax error
            </p>
            <p className="text-sm text-muted-foreground">{errorMessage}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!svg) return null;

  return (
    <div
      ref={wrapperRef}
      className={cn(
        "relative group/diagram w-full max-w-full min-w-0",
        fillHeight && "h-full",
        isFullscreen &&
          "fixed inset-4 z-[80] rounded-[20px] border border-border/70 bg-background shadow-2xl",
      )}
    >
      <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-0.5 rounded-xl border border-border/70 bg-background/88 p-1 shadow-sm backdrop-blur-sm opacity-100 transition-opacity md:opacity-0 md:group-hover/diagram:opacity-100">
        <button
          type="button"
          onClick={() => zoomBy(1.4)}
          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ZoomIn className="h-4 w-4" />
        </button>
        <span className="text-xs text-muted-foreground w-10 text-center tabular-nums select-none">
          {Math.round(displayScale * 100)}%
        </span>
        <button
          type="button"
          onClick={() => zoomBy(1 / 1.4)}
          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ZoomOut className="h-4 w-4" />
        </button>
        <div className="w-px h-4 bg-border mx-0.5" />
        <button
          type="button"
          onClick={fitToView}
          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          title="Reset view"
        >
          <LocateFixed className="h-4 w-4" />
        </button>
        <div className="w-px h-4 bg-border mx-0.5" />
        <button
          type="button"
          onClick={() => setIsFullscreen((prev) => !prev)}
          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          title={isFullscreen ? "Exit fullscreen" : "Open fullscreen"}
        >
          {isFullscreen ? (
            <Minimize2 className="h-4 w-4" />
          ) : (
            <Maximize2 className="h-4 w-4" />
          )}
        </button>
      </div>

      <div
        ref={containerRef}
        className={cn(
          `relative w-full max-w-full min-w-0 overflow-hidden ${canvasHeight} cursor-grab touch-none select-none active:cursor-grabbing`,
          embedded
            ? "bg-transparent"
            : "rounded-[18px] border border-border/60",
          !theme && !embedded && "bg-muted/25 dark:bg-muted/15",
        )}
        style={{
          ...(theme && !embedded && THEMES[theme]
            ? { backgroundColor: THEMES[theme].bg }
            : {}),
          backgroundImage:
            "radial-gradient(circle, hsl(var(--muted-foreground) / 0.15) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <div
          ref={contentRef}
          className="absolute left-0 top-0 origin-top-left"
        />
      </div>
    </div>
  );
}
