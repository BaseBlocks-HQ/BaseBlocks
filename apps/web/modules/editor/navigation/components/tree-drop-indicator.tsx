interface DropLineProps {
  position: "before" | "after";
}

/** Horizontal line with circle dot — shown for before/after reorder zones. */
export function DropLine({ position }: DropLineProps) {
  return (
    <div
      className="absolute right-2 h-[2px] bg-primary rounded-full pointer-events-none z-20"
      style={{
        left: "0.5rem",
        ...(position === "before" ? { top: "-1px" } : { bottom: "-1px" }),
      }}
    >
      <div className="absolute -left-[5px] top-1/2 -translate-y-1/2 w-[10px] h-[10px] rounded-full border-2 border-primary bg-background" />
    </div>
  );
}

/** Full-row background highlight — shown for inside/nest zone. */
export function DropHighlight() {
  return (
    <div className="absolute inset-0 mx-1 rounded-md bg-primary/20 ring-2 ring-inset ring-primary/50 pointer-events-none z-10" />
  );
}
