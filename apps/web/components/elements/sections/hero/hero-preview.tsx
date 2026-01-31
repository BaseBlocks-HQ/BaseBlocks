import type { ElementPreviewProps } from "../../registry";
import { cn } from "@/lib/utils";

export function HeroPreview({ className }: ElementPreviewProps) {
  return (
    <div
      className={cn(
        "w-full h-full p-3 flex flex-col items-center justify-center gap-2 bg-gradient-to-b from-muted/30 to-muted/60",
        className
      )}
    >
      <div className="h-2.5 w-20 bg-foreground/70 rounded" />
      <div className="h-1.5 w-24 bg-muted-foreground/40 rounded" />
      <div className="h-5 w-14 bg-primary/70 rounded mt-1 flex items-center justify-center">
        <div className="h-1 w-8 bg-primary-foreground/60 rounded" />
      </div>
    </div>
  );
}
