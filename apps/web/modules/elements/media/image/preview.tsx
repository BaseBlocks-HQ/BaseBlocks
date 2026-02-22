import { cn } from "@/lib/utils";
import { Image } from "lucide-react";
import type { ElementPreviewProps } from "../../framework/registry";

export function ImagePreview({ className }: ElementPreviewProps) {
  return (
    <div className={cn("w-full h-full p-3", className)}>
      <div className="w-full h-full bg-muted rounded-md border flex items-center justify-center">
        <Image className="h-6 w-6 text-muted-foreground/50" />
      </div>
    </div>
  );
}
