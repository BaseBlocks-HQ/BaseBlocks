"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "./lib/utils";

interface MiddleTruncateProps {
  text: string;
  className?: string;
  /** Number of characters to always show at the end (e.g., file extension) */
  endChars?: number;
}

/**
 * Truncates text in the middle, preserving the start and end.
 * Useful for filenames where you want to keep the extension visible.
 */
export function MiddleTruncate({
  text,
  className,
  endChars = 8,
}: MiddleTruncateProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [displayState, setDisplayState] = useState<{
    needsTruncation: boolean;
    truncatedText: string | null;
  }>({
    needsTruncation: false,
    truncatedText: null,
  });

  useEffect(() => {
    const container = containerRef.current;
    const textEl = textRef.current;
    if (!container || !textEl) return;

    let frameId: number | null = null;

    const checkTruncation = () => {
      frameId = requestAnimationFrame(() => {
        if (!container || !textEl) return;

        const containerWidth = container.offsetWidth;
        const textWidth = textEl.scrollWidth;
        const nextState = {
          needsTruncation: false,
          truncatedText: text,
        };

        if (textWidth > containerWidth) {
          nextState.needsTruncation = true;
          const avgCharWidth = textWidth / text.length;
          const availableChars = Math.floor(containerWidth / avgCharWidth) - 3; // -3 for ellipsis

          if (availableChars > endChars + 3) {
            const startChars = availableChars - endChars;
            const start = text.slice(0, startChars);
            const end = text.slice(-endChars);
            nextState.truncatedText = `${start}...${end}`;
          } else {
            nextState.truncatedText = `...${text.slice(-endChars)}`;
          }
        }

        setDisplayState(nextState);
      });
    };

    checkTruncation();

    const resizeObserver = new ResizeObserver(checkTruncation);
    resizeObserver.observe(container);

    return () => {
      if (frameId !== null) {
        cancelAnimationFrame(frameId);
      }
      resizeObserver.disconnect();
    };
  }, [text, endChars]);

  return (
    <div ref={containerRef} className={cn("overflow-hidden", className)}>
      <span
        ref={textRef}
        className={cn(
          "block whitespace-nowrap",
          displayState.needsTruncation && "overflow-hidden",
        )}
        title={text}
      >
        {displayState.truncatedText ?? text}
      </span>
    </div>
  );
}
