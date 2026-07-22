import { cn } from "@baseblocks/ui/lib/utils";

const baseClassName =
  "inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-full text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50";

const sizeClassNames = {
  icon: "size-9",
  lg: "h-10 gap-2 px-6",
  sm: "h-8 gap-1.5 px-3",
} as const;

const variantClassNames = {
  default: "bg-primary text-primary-foreground hover:bg-primary/90",
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
