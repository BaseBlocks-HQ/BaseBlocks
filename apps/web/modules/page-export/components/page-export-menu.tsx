"use client";

import type { PageExportMode } from "@/modules/page-export/lib/page-export";
import { downloadPageExport } from "@/modules/page-export/lib/page-export-link";
import { Button } from "@baseblocks/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@baseblocks/ui/dropdown-menu";
import { FileDown, MoreHorizontal } from "lucide-react";
import type { ReactNode } from "react";

interface PageExportMenuProps {
  pageId: string;
  mode: PageExportMode;
  align?: "start" | "center" | "end";
  trigger?: ReactNode;
}

export function PageExportMenu({
  pageId,
  mode,
  align = "end",
  trigger,
}: PageExportMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {trigger ?? (
          <Button variant="ghost" size="icon" title="Export page">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align}>
        <DropdownMenuItem
          onClick={(event) => {
            event.stopPropagation();
            downloadPageExport({
              pageId,
              format: "docx",
              mode,
            });
          }}
        >
          <FileDown className="h-4 w-4" />
          Export as Word
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
