import type { ElementPreviewProps } from "../../registry";
import { cn } from "@/lib/utils";
import { Play } from "lucide-react";

export function VideoPreview({ className }: ElementPreviewProps) {
  return (
    <div className={cn("w-full h-full p-3", className)}>
      <div className="w-full h-full bg-zinc-900 rounded-md flex items-center justify-center relative">
        <div className="h-8 w-8 bg-white/90 rounded-full flex items-center justify-center">
          <Play className="h-4 w-4 text-zinc-900 ml-0.5" />
        </div>
        <div className="absolute bottom-1 left-1 right-1 h-1 bg-white/20 rounded">
          <div className="h-full w-1/3 bg-white/60 rounded" />
        </div>
      </div>
    </div>
  );
}
