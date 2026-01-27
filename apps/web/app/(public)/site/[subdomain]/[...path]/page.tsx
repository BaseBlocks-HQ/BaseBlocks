"use client";

import { use } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@repo/backend";
import type { Id } from "@repo/backend";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  params: Promise<{ subdomain: string; path: string[] }>;
};

export default function PublicSitePage({ params }: Props) {
  const { subdomain, path } = use(params);
  const pageSlug = path[0] || "home";

  const site = useQuery(api.sites.queries.getBySlug, {
    companySlug: subdomain,
  });

  const company = useQuery(api.companies.queries.getBySlug, {
    slug: subdomain,
  });

  if (site === undefined || company === undefined) {
    return <PublicSiteSkeleton />;
  }

  if (!site || !company) {
    return <SiteNotFound subdomain={subdomain} />;
  }

  if (!site.isPublished) {
    return <SiteNotPublished />;
  }

  return (
    <PublicSiteLayout site={site} company={company} pageSlug={pageSlug} />
  );
}

function PublicSiteLayout({
  site,
  company,
  pageSlug,
}: {
  site: { _id: string; name: string; slug: string; settings: { navigationStyle: string; headerType: string } };
  company: { name: string; slug: string; logoUrl?: string; settings: { primaryColor?: string } };
  pageSlug: string;
}) {
  const pages = useQuery(api.pages.queries.getTree, {
    siteId: site._id as Id<"sites">,
  });

  const currentPage = useQuery(api.pages.queries.getBySlug, {
    siteId: site._id as Id<"sites">,
    slug: pageSlug,
  });

  const pageWithBlocks = useQuery(
    api.pages.queries.getWithBlocks,
    currentPage ? { pageId: currentPage._id as Id<"pages"> } : "skip"
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto flex h-14 items-center px-4">
          <div className="flex items-center gap-2">
            {company.logoUrl ? (
              <img
                src={company.logoUrl}
                alt={company.name}
                className="h-8 w-8 object-contain"
              />
            ) : (
              <div
                className="flex h-8 w-8 items-center justify-center rounded-lg text-white font-bold"
                style={{ backgroundColor: company.settings.primaryColor || "#0066FF" }}
              >
                {company.name[0]}
              </div>
            )}
            <span className="font-semibold">{site.name}</span>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar Navigation */}
        {site.settings.navigationStyle === "sidebar" && (
          <aside className="w-64 border-r min-h-[calc(100vh-56px)] p-4">
            <nav className="space-y-1">
              {pages === undefined ? (
                <>
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                </>
              ) : (
                pages.map((page) => (
                  <NavItem
                    key={page._id}
                    page={page}
                    currentSlug={pageSlug}
                  />
                ))
              )}
            </nav>
          </aside>
        )}

        {/* Main Content */}
        <main className="flex-1 p-8">
          {pageWithBlocks === undefined ? (
            <div className="max-w-3xl mx-auto">
              <Skeleton className="h-10 w-64 mb-8" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ) : pageWithBlocks === null ? (
            <div className="max-w-3xl mx-auto text-center py-12">
              <p className="text-muted-foreground">Page not found</p>
            </div>
          ) : (
            <article className="max-w-3xl mx-auto">
              <h1 className="text-3xl font-bold mb-8">{pageWithBlocks.page.title}</h1>
              <div className="prose prose-neutral dark:prose-invert max-w-none">
                {pageWithBlocks.blocks.map((block) => (
                  <BlockRenderer key={block._id} block={block} />
                ))}
              </div>
            </article>
          )}
        </main>
      </div>

      {/* Footer */}
      <footer className="border-t mt-auto">
        <div className="container mx-auto flex h-12 items-center justify-center px-4 text-sm text-muted-foreground">
          Powered by BaseBlocks
        </div>
      </footer>
    </div>
  );
}

function NavItem({
  page,
  currentSlug,
  depth = 0,
}: {
  page: { _id: string; title: string; slug: string; children?: Array<{ _id: string; title: string; slug: string; children?: unknown[] }> };
  currentSlug: string;
  depth?: number;
}) {
  const isActive = page.slug === currentSlug;

  return (
    <>
      <Link
        href={`/${page.slug}`}
        className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
          isActive
            ? "bg-primary/10 text-primary font-medium"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        }`}
        style={{ paddingLeft: `${(depth + 1) * 12}px` }}
      >
        <FileText className="h-4 w-4" />
        {page.title}
      </Link>
      {page.children?.map((child) => (
        <NavItem
          key={child._id}
          page={child as typeof page}
          currentSlug={currentSlug}
          depth={depth + 1}
        />
      ))}
    </>
  );
}

function BlockRenderer({ block }: { block: { type: string; content: unknown } }) {
  const content = block.content as { text?: string; level?: number; url?: string; filename?: string };

  switch (block.type) {
    case "heading": {
      const level = content.level || 2;
      if (level === 1) return <h1 className="text-3xl font-semibold mt-6 mb-4">{content.text}</h1>;
      if (level === 2) return <h2 className="text-2xl font-semibold mt-6 mb-4">{content.text}</h2>;
      if (level === 3) return <h3 className="text-xl font-semibold mt-6 mb-4">{content.text}</h3>;
      if (level === 4) return <h4 className="text-lg font-semibold mt-6 mb-4">{content.text}</h4>;
      return <h5 className="font-semibold mt-6 mb-4">{content.text}</h5>;
    }

    case "paragraph":
      return <p className="mb-4 leading-relaxed">{content.text}</p>;

    case "image":
      return (
        <figure className="my-6">
          <img
            src={content.url}
            alt=""
            className="rounded-lg max-w-full"
          />
        </figure>
      );

    case "file":
      return (
        <div className="my-4 p-4 border rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="h-8 w-8 text-muted-foreground" />
            <span className="font-medium">{content.filename}</span>
          </div>
          <Button variant="outline" size="sm" asChild>
            <a href={content.url} download>
              <Download className="h-4 w-4 mr-2" />
              Download
            </a>
          </Button>
        </div>
      );

    case "divider":
      return <hr className="my-8" />;

    case "callout":
      return (
        <div className="my-4 p-4 bg-muted rounded-lg">
          {content.text}
        </div>
      );

    default:
      return null;
  }
}

function PublicSiteSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto flex h-14 items-center px-4">
          <Skeleton className="h-8 w-48" />
        </div>
      </header>
      <div className="flex">
        <aside className="w-64 border-r min-h-[calc(100vh-56px)] p-4">
          <Skeleton className="h-8 w-full mb-2" />
          <Skeleton className="h-8 w-full mb-2" />
          <Skeleton className="h-8 w-full" />
        </aside>
        <main className="flex-1 p-8">
          <div className="max-w-3xl mx-auto">
            <Skeleton className="h-10 w-64 mb-8" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </main>
      </div>
    </div>
  );
}

function SiteNotFound({ subdomain }: { subdomain: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Site Not Found</h1>
        <p className="text-muted-foreground mb-8">
          The site at <strong>{subdomain}.baseblocks.dev</strong> doesn&apos;t exist.
        </p>
        <Button asChild>
          <Link href="/">Go to BaseBlocks</Link>
        </Button>
      </div>
    </div>
  );
}

function SiteNotPublished() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Site Not Available</h1>
        <p className="text-muted-foreground mb-8">
          This site is not yet published.
        </p>
        <Button asChild>
          <Link href="/">Go to BaseBlocks</Link>
        </Button>
      </div>
    </div>
  );
}
