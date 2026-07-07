"use client";

import { cn } from "@/lib/utils";

export function ViewerToolbarIconButton({
  children,
  className,
  disabled,
  label,
  onClick,
  pressed,
}: {
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  label: string;
  onClick: () => void;
  pressed?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-primary/5 hover:text-primary focus-visible:bg-primary/5 focus-visible:text-primary focus-visible:outline-none disabled:pointer-events-none disabled:opacity-40",
        pressed && "bg-primary/10 text-primary",
        className,
      )}
      disabled={disabled}
      onClick={onClick}
      title={label}
    >
      {children}
    </button>
  );
}
