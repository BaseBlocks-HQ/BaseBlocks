import { cn } from "./lib/utils";

interface BlurStackProps {
  backgroundColor?: string;
  blurAmount?: string;
  className?: string;
  direction: "down" | "left" | "right" | "up";
}

export function BlurStack({
  backgroundColor = "hsl(var(--background))",
  blurAmount = "4px",
  className,
  direction,
}: BlurStackProps) {
  const background =
    direction === "down"
      ? `linear-gradient(to top, transparent, ${backgroundColor})`
      : direction === "up"
        ? `linear-gradient(to bottom, transparent, ${backgroundColor})`
        : direction === "left"
          ? `linear-gradient(to right, transparent, ${backgroundColor})`
          : `linear-gradient(to left, transparent, ${backgroundColor})`;

  const maskImage =
    direction === "down"
      ? `linear-gradient(to bottom, ${backgroundColor} 50%, transparent)`
      : direction === "up"
        ? `linear-gradient(to top, ${backgroundColor} 50%, transparent)`
        : direction === "left"
          ? `linear-gradient(to right, ${backgroundColor} 50%, transparent)`
          : `linear-gradient(to left, ${backgroundColor} 50%, transparent)`;

  return (
    <div
      aria-hidden
      className={cn("pointer-events-none absolute select-none", className)}
      style={{
        backdropFilter: `blur(${blurAmount})`,
        background,
        maskImage,
        WebkitBackdropFilter: `blur(${blurAmount})`,
        WebkitMaskImage: maskImage,
        WebkitUserSelect: "none",
        userSelect: "none",
      }}
    />
  );
}
