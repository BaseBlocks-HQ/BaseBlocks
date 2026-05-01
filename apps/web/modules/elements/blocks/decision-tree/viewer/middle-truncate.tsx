"use client";

import { cn } from "@/lib/utils";
import { useLayoutEffect, useRef, useState } from "react";

function getTextWidth(text: string, font: string): number {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return 0;
  ctx.font = font;
  return ctx.measureText(text).width;
}

function computeMiddleTruncation(
  text: string,
  availableWidth: number,
  font: string,
): string {
  // Avoid returning full text at 0 width — it inflates min-content inside flex + Radix ScrollArea (display:table inner).
  if (availableWidth <= 0) return "";

  const ellipsis = "…";
  if (getTextWidth(text, font) <= availableWidth) return text;

  const ellipsisWidth = getTextWidth(ellipsis, font);
  const budget = Math.max(availableWidth - ellipsisWidth, 0);
  const half = budget / 2;

  let prefixLen = 0;
  for (let i = 1; i <= text.length; i++) {
    if (getTextWidth(text.slice(0, i), font) <= half) {
      prefixLen = i;
    } else {
      break;
    }
  }

  let suffixLen = 0;
  for (let i = 1; i <= text.length; i++) {
    if (getTextWidth(text.slice(-i), font) <= half) {
      suffixLen = i;
    } else {
      break;
    }
  }

  if (prefixLen + suffixLen >= text.length) return text;

  const prefix = text.slice(0, prefixLen);
  const suffix = suffixLen > 0 ? text.slice(-suffixLen) : "";
  return `${prefix}${ellipsis}${suffix}`;
}

interface MiddleTruncateProps {
  text: string;
  className?: string;
}

export function MiddleTruncate({ text, className }: MiddleTruncateProps) {
  const containerRef = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState("");

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    function update() {
      if (!el) return;
      const style = getComputedStyle(el);
      const font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
      setDisplay(computeMiddleTruncation(text, el.offsetWidth, font));
    }

    let cancelled = false;
    document.fonts?.ready?.then(() => {
      if (!cancelled) update();
    });

    const observer = new ResizeObserver(update);
    observer.observe(el);
    update();
    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [text]);

  return (
    <span
      ref={containerRef}
      title={text}
      aria-label={text}
      className={cn(
        "block min-w-0 overflow-hidden whitespace-nowrap",
        className,
      )}
    >
      {display}
    </span>
  );
}
