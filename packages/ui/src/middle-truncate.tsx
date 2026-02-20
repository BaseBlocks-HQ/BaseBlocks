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
  const [truncatedText, setTruncatedText] = useState(text);
  const [needsTruncation, setNeedsTruncation] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    const textEl = textRef.current;
    if (!container || !textEl) return;

    const checkTruncation = () => {
      // Reset to full text to measure
      setTruncatedText(text);
      setNeedsTruncation(false);

      // Use requestAnimationFrame to ensure DOM has updated
      requestAnimationFrame(() => {
        if (!container || !textEl) return;

        const containerWidth = container.offsetWidth;
        const textWidth = textEl.scrollWidth;

        if (textWidth > containerWidth) {
          setNeedsTruncation(true);
          // Calculate how much text we can fit
          const avgCharWidth = textWidth / text.length;
          const availableChars = Math.floor(containerWidth / avgCharWidth) - 3; // -3 for ellipsis

          if (availableChars > endChars + 3) {
            const startChars = availableChars - endChars;
            const start = text.slice(0, startChars);
            const end = text.slice(-endChars);
            setTruncatedText(`${start}...${end}`);
          } else {
            // Not enough room, just show ellipsis and end
            setTruncatedText(`...${text.slice(-endChars)}`);
          }
        }
      });
    };

    checkTruncation();

    // Recheck on resize
    const resizeObserver = new ResizeObserver(checkTruncation);
    resizeObserver.observe(container);

    return () => resizeObserver.disconnect();
  }, [text, endChars]);

  return (
    <div ref={containerRef} className={cn("overflow-hidden", className)}>
      <span
        ref={textRef}
        className={cn("whitespace-nowrap", needsTruncation ? "block" : "block")}
        title={text}
      >
        {truncatedText}
      </span>
    </div>
  );
}
