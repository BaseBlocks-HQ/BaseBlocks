import type { SaveStatus } from "@baseblocks/types";
import { Check, Loader2 } from "lucide-react";

interface SaveIndicatorProps {
  status: SaveStatus;
}

export function SaveIndicator({ status }: SaveIndicatorProps) {
  if (status === "idle") {
    return null;
  }

  return (
    <div
      className={`flex items-center gap-1.5 text-sm transition-opacity duration-300 ${
        status === "saved" ? "text-green-600" : "text-muted-foreground"
      }`}
    >
      {status === "pending" && (
        <>
          <div className="h-2 w-2 rounded-full bg-yellow-500" />
          <span>Unsaved changes</span>
        </>
      )}
      {status === "saving" && (
        <>
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <span>Saving...</span>
        </>
      )}
      {status === "saved" && (
        <>
          <Check className="h-3.5 w-3.5" />
          <span>Saved</span>
        </>
      )}
    </div>
  );
}
