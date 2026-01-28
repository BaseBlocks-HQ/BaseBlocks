"use client";

import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PreviewButtonProps {
  companySlug: string;
}

export function PreviewButton({ companySlug }: PreviewButtonProps) {
  const handlePreview = () => {
    const port = window.location.port || "3000";
    window.open(`http://${companySlug}.localhost:${port}/`, "_blank");
  };

  return (
    <Button variant="outline" size="sm" onClick={handlePreview}>
      <Eye className="h-4 w-4 mr-1.5" />
      Preview
    </Button>
  );
}
