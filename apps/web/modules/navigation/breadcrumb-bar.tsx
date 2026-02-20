"use client";

import { getPageLink } from "@/lib/url";
import { cn } from "@/lib/utils";
import { usePublicSiteContext } from "@/modules/public-site/public-site-context";
import { api } from "@baseblocks/backend";
import type { Id } from "@baseblocks/backend";
import { useQuery } from "convex/react";
import { ChevronRight, Home } from "lucide-react";
import Link from "next/link";
import { Fragment, useMemo } from "react";

interface BreadcrumbBarProps {
  pageId: Id<"pages">;
  pageTitle: string;
  className?: string;
}

/**
 * Slim breadcrumb navigation bar that sits below the header/subnav
 * Styled to match the SubNavBar aesthetic
 */
export function BreadcrumbBar({
  pageId,
  pageTitle,
  className,
}: BreadcrumbBarProps) {
  const { siteSlug } = usePublicSiteContext();
  const ancestors = useQuery(api.pages.queries.getAncestors, { pageId });

  // Build path strings for each ancestor
  const breadcrumbItems = useMemo(() => {
    if (!ancestors) return [];

    const items: Array<{
      _id: string;
      title: string;
      path: string;
    }> = [];

    let currentPath = "";

    for (const ancestor of ancestors) {
      currentPath = currentPath
        ? `${currentPath}/${ancestor.slug}`
        : ancestor.slug;
      items.push({
        _id: ancestor._id,
        title: ancestor.title,
        path: currentPath,
      });
    }

    return items;
  }, [ancestors]);

  // Don't show breadcrumbs for root-level pages with no ancestors
  if (ancestors === undefined || ancestors.length === 0) {
    return null;
  }

  return (
    <nav className={cn("border-b bg-muted/30", className)}>
      <div className="container mx-auto px-4">
        <div className="flex h-8 items-center">
          <ol className="flex items-center gap-1 text-sm text-muted-foreground">
            {/* Home link */}
            <li>
              <Link
                href={getPageLink(siteSlug, "home")}
                className="flex items-center hover:text-foreground transition-colors"
              >
                <Home className="h-3.5 w-3.5" />
                <span className="sr-only">Home</span>
              </Link>
            </li>
            <li>
              <ChevronRight className="h-3.5 w-3.5" />
            </li>

            {/* Ancestor pages */}
            {breadcrumbItems.map((item) => (
              <Fragment key={item._id}>
                <li>
                  <Link
                    href={getPageLink(siteSlug, item.path)}
                    className="hover:text-foreground transition-colors"
                  >
                    {item.title}
                  </Link>
                </li>
                <li>
                  <ChevronRight className="h-3.5 w-3.5" />
                </li>
              </Fragment>
            ))}

            {/* Current page */}
            <li className="text-foreground font-medium truncate max-w-[200px]">
              {pageTitle}
            </li>
          </ol>
        </div>
      </div>
    </nav>
  );
}
