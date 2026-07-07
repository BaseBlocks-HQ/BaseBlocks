"use client";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@baseblocks/ui/button";
import { SidebarTrigger } from "fumadocs-ui/components/sidebar/base";
import { useSearchContext } from "fumadocs-ui/contexts/search";
import { Search, Sidebar } from "lucide-react";

// Failure modes:
// - Search can be disabled by the docs search provider, so the trigger must hide cleanly
// - Sidebar toggle must stay inside Fumadocs' sidebar provider to open the mobile drawer
// - Narrow viewports need icon-only controls to preserve room for the rest of the header

export function DocsMobileHeaderActions() {
  const { enabled, setOpenSearch } = useSearchContext();

  return (
    <div className="flex items-center gap-1 md:hidden">
      {enabled ? (
        <button
          type="button"
          className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }))}
          aria-label="Open Search"
          onClick={() => {
            setOpenSearch(true);
          }}
        >
          <Search className="h-4 w-4" />
          <span className="sr-only">Open search</span>
        </button>
      ) : null}

      <SidebarTrigger
        className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }))}
      >
        <Sidebar className="h-4 w-4" />
        <span className="sr-only">Toggle docs navigation</span>
      </SidebarTrigger>
    </div>
  );
}
