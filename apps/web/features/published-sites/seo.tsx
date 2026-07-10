import type { PublishedPageResult } from "./read-model";
import { getCanonicalUrl } from "./urls";
import { JsonLdScript } from "./json-ld";

export function PublicSiteSeo({
  result,
  customDomain,
}: {
  result: PublishedPageResult;
  customDomain?: string;
}) {
  if (
    result.access.visibility !== "public" ||
    result.access.status !== "accessible"
  )
    return null;
  const siteTitle = result.site.settings.siteTitle?.trim() || result.site.name;
  const siteUrl = getCanonicalUrl({
    organizationSlug: result.organization.slug,
    siteSlug: result.site.slug,
    customDomain,
  });
  const breadcrumb = result.breadcrumbs.length
    ? {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: result.breadcrumbs.map(
          (crumb: { title: string; path: string[] }, index: number) => ({
            "@type": "ListItem",
            position: index + 1,
            name: crumb.title,
            item: getCanonicalUrl({
              organizationSlug: result.organization.slug,
              siteSlug: result.site.slug,
              pagePath: crumb.path,
              customDomain,
            }),
          }),
        ),
      }
    : null;
  return (
    <>
      <JsonLdScript
        data={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: siteTitle,
          url: siteUrl,
          ...(result.site.settings.siteDescription
            ? { description: result.site.settings.siteDescription }
            : {}),
        }}
      />
      {breadcrumb ? <JsonLdScript data={breadcrumb} /> : null}
    </>
  );
}
