import type { ElementPreviewProps } from "../../registry";
import { cn } from "@/lib/utils";

export function DividerPreview({ className }: ElementPreviewProps) {
  return (
    <div className={cn("w-full h-full p-3 flex items-center", className)}>
      <div className="w-full h-px bg-border" />
    </div>
  );
}
