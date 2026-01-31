import type { ElementPreviewProps } from "../../registry";
import { cn } from "@/lib/utils";

export function CodePreview({ className }: ElementPreviewProps) {
  return (
    <div className={cn("w-full h-full p-3", className)}>
      <div className="w-full h-full bg-zinc-900 rounded p-2 flex flex-col gap-1">
        <div className="h-1 w-1/2 bg-emerald-500/50 rounded" />
        <div className="h-1 w-3/4 bg-sky-500/50 rounded" />
        <div className="h-1 w-1/3 bg-amber-500/50 rounded" />
      </div>
    </div>
  );
}
