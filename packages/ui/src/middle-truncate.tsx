import type { MouseEventHandler, RefCallback } from "react";

import { cn } from "./lib/utils";

export function getMiddleTruncateParts(text: string) {
  if (text.length <= 16) return [text, ""] as const;

  const suffixLength = Math.min(12, Math.max(6, Math.ceil(text.length * 0.3)));
  return [text.slice(0, -suffixLength), text.slice(-suffixLength)] as const;
}

export function MiddleTruncate({
  className,
  leadingRef,
  onDoubleClick,
  text,
}: {
  className?: string;
  leadingRef?: RefCallback<HTMLSpanElement>;
  onDoubleClick?: MouseEventHandler<HTMLSpanElement>;
  text: string;
}) {
  const [leading, trailing] = getMiddleTruncateParts(text);

  return (
    <span className={cn("min-w-0", className)}>
      <span className="sr-only">{text}</span>
      <span
        aria-hidden="true"
        className="flex min-w-0 max-w-full"
        onDoubleClick={onDoubleClick}
      >
        <span
          className="min-w-0 overflow-hidden text-ellipsis whitespace-pre"
          ref={leadingRef}
        >
          {leading}
        </span>
        {trailing ? (
          <span className="shrink-0 whitespace-pre">{trailing}</span>
        ) : null}
      </span>
    </span>
  );
}
