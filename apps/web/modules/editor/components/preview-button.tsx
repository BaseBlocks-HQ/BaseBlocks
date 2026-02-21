"use client";

import { Button } from "@baseblocks/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@baseblocks/ui/tooltip";
import { Eye } from "lucide-react";

interface PreviewButtonProps {
  teamSlug: string;
  siteSlug: string;
  siteUrl: string;
}

export function PreviewButton({
  teamSlug,
  siteSlug,
  siteUrl,
}: PreviewButtonProps) {
  const handlePreview = () => {
    const isLocalhost =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1" ||
      window.location.hostname.endsWith(".localhost");

    if (isLocalhost) {
      const port = window.location.port || "3000";
      window.open(`http://${teamSlug}.localhost:${port}/${siteSlug}`, "_blank");
    } else {
      window.open(siteUrl, "_blank");
    }
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon-sm" onClick={handlePreview}>
          <Eye />
        </Button>
      </TooltipTrigger>
      <TooltipContent>Preview</TooltipContent>
    </Tooltip>
  );
}
