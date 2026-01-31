import type { ElementPreviewProps } from "../../registry";
import { cn } from "@/lib/utils";

export function HeadingPreview({ className }: ElementPreviewProps) {
  return (
    <div className={cn("w-full h-full p-3 flex flex-col justify-center", className)}>
      <div className="h-3 w-3/4 bg-foreground/80 rounded" />
      <div className="h-2 w-1/2 bg-muted-foreground/30 rounded mt-2" />
    </div>
  );
}
