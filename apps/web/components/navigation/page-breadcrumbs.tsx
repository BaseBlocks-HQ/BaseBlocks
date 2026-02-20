"use client";

import { usePublicSiteContext } from "@/components/public/public-site-context";
import { getPageLink } from "@/lib/utils";
import { api } from "@repo/backend";
import type { Id } from "@repo/backend";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@repo/ui/breadcrumb";
import { useQuery } from "convex/react";
import { Home } from "lucide-react";
import Link from "next/link";
import { Fragment, useMemo } from "react";

interface PageBreadcrumbsProps {
  pageId: Id<"pages">;
  pageTitle: string;
}

export function PageBreadcrumbs({ pageId, pageTitle }: PageBreadcrumbsProps) {
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
