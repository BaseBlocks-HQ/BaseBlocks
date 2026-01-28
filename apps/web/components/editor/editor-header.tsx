"use client";

import { ChevronRight, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { PreviewButton } from "./preview-button";
import { getSiteUrl } from "@/lib/utils";
import type { PageListItem } from "@/types";

interface EditorHeaderProps {
  selectedPage?: PageListItem;
  isDefault?: boolean;
  companySlug: string;
  sitePublished: boolean;
}

export function EditorHeader({
  selectedPage,
  isDefault,
  companySlug,
  sitePublished,
}: EditorHeaderProps) {
  return (
    <header className="border-b h-14 flex items-center justify-between px-4">
      <div className="flex items-center gap-2">
        <SidebarTrigger />
        {selectedPage && (
          <>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{selectedPage.title}</span>
            {isDefault && (
              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                Default
              </span>
            )}
          </>
        )}
      </div>
      <div className="flex items-center gap-2">
        <PreviewButton companySlug={companySlug} />
        {sitePublished && (
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
        )}
      </div>
    </header>
  );
}
