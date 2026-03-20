import type { CSSProperties } from "react";

const blurLevels = [1, 2, 3, 6, 12] as const;
const blurOpacities = [0.95, 0.8, 0.68, 0.52, 0.4] as const;

const maskStyle: CSSProperties = {
  WebkitMaskImage:
    "linear-gradient(to bottom, rgba(0, 0, 0, 1) 0%, rgba(0, 0, 0, 0.9) 58%, transparent 100%)",
  maskImage:
    "linear-gradient(to bottom, rgba(0, 0, 0, 1) 0%, rgba(0, 0, 0, 0.9) 58%, transparent 100%)",
};

export function PublicHeaderBlur() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-0 h-(--bb-header-height) overflow-hidden"
    >
      {blurLevels.map((blur, index) => (
        <div
          key={blur}
          className="absolute inset-0 bg-background/9 dark:bg-background/18"
          style={{
            ...maskStyle,
            WebkitBackdropFilter: `blur(${blur}px)`,
            backdropFilter: `blur(${blur}px)`,
            opacity: blurOpacities[index],
          }}
        />
      ))}
    </div>
  );
}
