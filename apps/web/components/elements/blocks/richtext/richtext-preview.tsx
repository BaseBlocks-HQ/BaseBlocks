import { cn } from "@/lib/utils";
import type { ElementPreviewProps } from "../../registry";

export function RichTextPreview({ className }: ElementPreviewProps) {
  return (
    <div
      className={cn(
        "w-full h-full p-3 flex flex-col justify-center gap-1.5",
        className,
      )}
    >
      <div className="h-2 w-1/3 bg-muted-foreground/40 rounded font-bold" />
      <div className="h-1.5 w-full bg-muted-foreground/30 rounded" />
      <div className="h-1.5 w-full bg-muted-foreground/30 rounded" />
      <div className="h-1.5 w-2/3 bg-primary/30 rounded" />
    </div>
  );
}
