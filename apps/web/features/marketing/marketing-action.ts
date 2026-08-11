import { cn } from "@baseblocks/ui/lib/utils";

const baseClassName =
  "inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-[0.625rem] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50";

const sizeClassNames = {
  icon: "size-9",
  compact: "h-7 gap-1.5 px-2.5 text-xs",
} as const;

const variantClassNames = {
  default: "landing-primary-action",
  ghost: "hover:bg-accent hover:text-accent-foreground",
} as const;

export function marketingActionClassName({
  className,
  size,
  variant,
}: {
  className?: string;
  size: keyof typeof sizeClassNames;
  variant: keyof typeof variantClassNames;
}) {
  return cn(
    baseClassName,
    sizeClassNames[size],
    variantClassNames[variant],
    className,
  );
}
