"use client";

import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@baseblocks/ui/breadcrumb";
import { Button } from "@baseblocks/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@baseblocks/ui/dropdown-menu";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";

interface DecisionTreeBreadcrumbNavProps {
  path: string[];
  getNodeName: (nodeId: string) => string;
  onNavigateToIndex: (index: number) => void;
}

export function DecisionTreeBreadcrumbNav({
  path,
  getNodeName,
  onNavigateToIndex,
}: DecisionTreeBreadcrumbNavProps) {
  const t = useTranslations("elements.decisionTree");

  return (
    <div className="flex items-center gap-1 px-2 py-1">
      {path.length > 0 && (
        <Button
          variant="ghost"
          size="icon-xs"
          className="shrink-0 text-muted-foreground hover:text-foreground"
          onClick={() => onNavigateToIndex(path.length - 1)}
        >
          <ChevronLeft className="size-3.5" />
        </Button>
      )}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            {path.length > 0 ? (
              <BreadcrumbLink
                className="cursor-pointer text-[11px] text-muted-foreground hover:text-foreground"
                onClick={() => onNavigateToIndex(0)}
              >
                {t("root")}
              </BreadcrumbLink>
            ) : (
              <BreadcrumbPage className="text-[11px] text-muted-foreground">
                {t("root")}
              </BreadcrumbPage>
            )}
          </BreadcrumbItem>
          {path.length >= 3 ? (
            <>
              <BreadcrumbSeparator>
                <ChevronRight className="size-3" />
              </BreadcrumbSeparator>
              <BreadcrumbItem>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="icon-xs"
                      variant="ghost"
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <BreadcrumbEllipsis className="size-4" />
                      <span className="sr-only">{t("breadcrumbShowMore")}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuGroup>
                      {path.slice(0, -1).map((nodeId, index) => (
                        <DropdownMenuItem
                          key={nodeId}
                          onClick={() => onNavigateToIndex(index + 1)}
                        >
                          {getNodeName(nodeId)}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              </BreadcrumbItem>
              <BreadcrumbSeparator>
                <ChevronRight className="size-3 text-muted-foreground/70" />
              </BreadcrumbSeparator>
              <BreadcrumbItem>
                <BreadcrumbPage className="max-w-[120px] truncate text-[11px]">
                  {getNodeName(path.at(-1) ?? "")}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </>
          ) : (
            path.map((nodeId, index) => (
              <span key={nodeId} className="contents">
                <BreadcrumbSeparator>
                  <ChevronRight className="size-3 text-muted-foreground/70" />
                </BreadcrumbSeparator>
                <BreadcrumbItem>
                  {index === path.length - 1 ? (
                    <BreadcrumbPage className="max-w-[120px] truncate text-[11px]">
                      {getNodeName(nodeId)}
                    </BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink
                      className="max-w-[120px] cursor-pointer truncate text-[11px] text-muted-foreground hover:text-foreground"
                      onClick={() => onNavigateToIndex(index + 1)}
                    >
                      {getNodeName(nodeId)}
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
              </span>
            ))
          )}
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  );
}
