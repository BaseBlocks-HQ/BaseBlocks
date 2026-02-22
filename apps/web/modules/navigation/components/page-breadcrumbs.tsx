"use client";

import { usePageAncestors } from "@/lib/data";
import { getPageLink } from "@/lib/url";
import { usePublicSiteContext } from "@/modules/public-site/public-site-context";
import type { Id } from "@baseblocks/backend";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@baseblocks/ui/breadcrumb";
import { Home } from "lucide-react";
import Link from "next/link";
import { Fragment } from "react";

interface PageBreadcrumbsProps {
  pageId: Id<"pages">;
  pageTitle: string;
}

export function PageBreadcrumbs({ pageId, pageTitle }: PageBreadcrumbsProps) {
  const { siteSlug } = usePublicSiteContext();
  const ancestors = usePageAncestors(pageId);

  // Build path strings for each ancestor
  const breadcrumbItems = (() => {
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
  })();

  // Don't show breadcrumbs for root-level pages with no ancestors
  if (ancestors === undefined || ancestors.length === 0) {
    return null;
  }

  return (
    <Breadcrumb className="mb-6 max-w-3xl mx-auto">
      <BreadcrumbList>
        {/* Home link */}
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link
              href={getPageLink(siteSlug, "home")}
              className="flex items-center gap-1"
            >
              <Home className="h-3.5 w-3.5" />
              <span className="sr-only">Home</span>
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />

        {/* Ancestor pages */}
        {breadcrumbItems.map((item) => (
          <Fragment key={item._id}>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href={getPageLink(siteSlug, item.path)}>
                  {item.title}
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
          </Fragment>
        ))}

        {/* Current page */}
        <BreadcrumbItem>
          <BreadcrumbPage>{pageTitle}</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}
