import { cn } from "@/lib/utils";
import type { ElementPreviewProps } from "../../registry";

export function ParagraphPreview({ className }: ElementPreviewProps) {
  return (
    <div
      className={cn(
        "w-full h-full p-3 flex flex-col justify-center gap-1.5",
        className,
      )}
    >
      <div className="h-1.5 w-full bg-muted-foreground/30 rounded" />
      <div className="h-1.5 w-full bg-muted-foreground/30 rounded" />
      <div className="h-1.5 w-3/4 bg-muted-foreground/30 rounded" />
    </div>
  );
}
