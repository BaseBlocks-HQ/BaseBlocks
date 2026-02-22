import { cn } from "@/lib/utils";
import type { ElementPreviewProps } from "../../framework/registry";

export function BannerPreview({ className }: ElementPreviewProps) {
  return (
    <div
      className={cn(
        "w-full h-full p-3 flex flex-col gap-1.5 justify-center",
        className,
      )}
    >
      <div className="w-full h-3 bg-red-500/30 rounded-sm flex items-center px-1.5">
        <div className="h-1 w-2/3 bg-red-500/50 rounded-sm" />
      </div>
      <div className="w-full h-3 bg-amber-500/30 rounded-sm flex items-center px-1.5">
        <div className="h-1 w-1/2 bg-amber-500/50 rounded-sm" />
      </div>
      <div className="w-full h-3 bg-blue-500/30 rounded-sm flex items-center px-1.5">
        <div className="h-1 w-3/4 bg-blue-500/50 rounded-sm" />
      </div>
    </div>
  );
}
