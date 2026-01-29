"use client";

import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { getSiteUrl } from "@/lib/utils";
import { EyeOff, Globe } from "lucide-react";
import { PreviewButton } from "./preview-button";

interface EditorHeaderProps {
  companySlug: string;
  sitePublished: boolean;
  onPublish: () => void;
  onUnpublish?: () => void;
}

export function EditorHeader({
  companySlug,
  sitePublished,
  onPublish,
  onUnpublish,
}: EditorHeaderProps) {
  return (
    <header className="border-b h-14 flex items-center justify-between px-4">
      <div className="flex items-center gap-2">
        <SidebarTrigger />
      </div>
      <div className="flex items-center gap-2">
        <PreviewButton companySlug={companySlug} />
        {sitePublished ? (
          <>
            {onUnpublish && (
              <Button variant="outline" size="sm" onClick={onUnpublish}>
                <EyeOff className="h-4 w-4 mr-1.5" />
                Unpublish
              </Button>
            )}
            <Button variant="outline" size="sm" asChild>
              <a
                href={getSiteUrl(companySlug)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Globe className="h-4 w-4 mr-1.5" />
                View Live
              </a>
            </Button>
          </>
        ) : (
          <Button size="sm" onClick={onPublish}>
            <Globe className="h-4 w-4 mr-1.5" />
            Publish
          </Button>
        )}
      </div>
    </header>
  );
}
