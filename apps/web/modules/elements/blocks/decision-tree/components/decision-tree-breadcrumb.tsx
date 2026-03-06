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

interface DecisionTreeBreadcrumbProps {
  path: string[];
  getNodeName: (nodeId: string) => string;
  onNavigateToIndex: (index: number) => void;
}

export function DecisionTreeBreadcrumb({
  path,
  getNodeName,
  onNavigateToIndex,
}: DecisionTreeBreadcrumbProps) {
  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink
            className="cursor-pointer"
            onClick={() => onNavigateToIndex(0)}
          >
            Start
          </BreadcrumbLink>
        </BreadcrumbItem>
        {path.length >= 3 ? (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="icon" variant="ghost" className="size-6">
                    <BreadcrumbEllipsis className="size-4" />
                    <span className="sr-only">Show more</span>
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
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="font-medium">
                {getNodeName(path.at(-1) ?? "")}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </>
        ) : (
          path.map((nodeId, index) => (
            <span key={nodeId} className="contents">
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                {index === path.length - 1 ? (
                  <BreadcrumbPage className="font-medium">
                    {getNodeName(nodeId)}
                  </BreadcrumbPage>
                ) : (
                  <BreadcrumbLink
                    className="cursor-pointer"
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
  );
}
