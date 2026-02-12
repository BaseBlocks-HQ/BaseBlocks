"use client";

import { Button } from "@/components/ui/button";
import { getSiteUrl } from "@/lib/utils";
import { Eye } from "lucide-react";

interface PreviewButtonProps {
  companySlug: string;
  siteSlug: string;
}

export function PreviewButton({ companySlug, siteSlug }: PreviewButtonProps) {
  const handlePreview = () => {
    const isLocalhost =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1" ||
      window.location.hostname.endsWith(".localhost");

    if (isLocalhost) {
      const port = window.location.port || "3000";
      window.open(
        `http://${companySlug}.localhost:${port}/${siteSlug}`,
        "_blank",
      );
    } else {
      window.open(getSiteUrl(companySlug, siteSlug), "_blank");
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={handlePreview}>
      <Eye className="h-4 w-4 mr-1.5" />
      Preview
    </Button>
  );
}
