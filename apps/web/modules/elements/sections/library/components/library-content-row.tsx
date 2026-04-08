"use client";

import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

interface LibraryContentRowProps {
  icon: ReactNode;
  title: ReactNode;
  meta?: ReactNode;
  onClick?: () => void;
  actions?: ReactNode;
  className?: string;
  showChevron?: boolean;
}

export function LibraryContentRow({
  icon,
  title,
  meta,
  onClick,
  actions,
  className,
  showChevron = false,
}: LibraryContentRowProps) {
  const content = (
    <>
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted/60 text-muted-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.32),0_1px_2px_rgba(15,23,42,0.06)]">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="min-w-0 text-sm font-medium leading-5">{title}</div>
        {meta ? (
          <div className="mt-0.5 text-xs text-muted-foreground tabular-nums">
            {meta}
          </div>
        ) : null}
      </div>
    </>
  );

  return (
    <div
      className={cn(
        "group flex w-full min-w-0 items-center gap-3 rounded-xl px-3 py-2 transition-colors hover:bg-muted/50",
        className,
      )}
    >
      {onClick ? (
        <button
          type="button"
          onClick={onClick}
          className="flex min-w-0 flex-1 items-center gap-3 text-left focus-visible:outline-none"
        >
          {content}
        </button>
      ) : (
        <div className="flex min-w-0 flex-1 items-center gap-3">{content}</div>
      )}

      {actions ? (
        <div className="flex shrink-0 items-center gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
          {actions}
        </div>
      ) : showChevron ? (
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/70" />
      ) : null}
    </div>
  );
}
