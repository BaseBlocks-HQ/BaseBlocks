const pages = [
  {
    id: "audit-home",
    path: [] as string[],
    slug: "home",
    title: "Acme Knowledge Base",
    text: "Acme publishes searchable team documentation with BaseBlocks.",
    updatedAt: 1_700_000_000_000,
  },
  {
    id: "audit-guide",
    path: ["guides"],
    slug: "guides",
    title: "Getting Started",
    text: "A representative customer guide rendered in the initial HTML.",
    updatedAt: 1_700_000_100_000,
  },
] as const;

export function seoAuditFixturesEnabled(): boolean {
  return (
    process.env.BASEBLOCKS_SEO_AUDIT === "1" && process.env.VERCEL !== "1"
  );
}

export function resolveSeoAuditCustomDomain(hostname: string) {
  if (!seoAuditFixturesEnabled() || hostname !== "docs.example.test") {
    return null;
  }
  return { organizationSlug: "acme", siteSlug: "handbook" };
}

export function resolveSeoAuditSitemap(
  organizationSlug: string,
  siteSlug?: string,
) {
  if (
    !seoAuditFixturesEnabled() ||
    organizationSlug !== "acme" ||
    (siteSlug && siteSlug !== "handbook")
  ) {
    return null;
  }
  return [
    {
      siteSlug: "handbook",
      updatedAt: 1_700_000_100_000,
      pages: pages.map((page) => ({
        path: [...page.path],
        updatedAt: page.updatedAt,
      })),
    },
  ];
}

export function resolveSeoAuditPage(
  organizationSlug: string,
  siteSlug: string | undefined,
  pagePath: string[],
) {
  if (!seoAuditFixturesEnabled()) return undefined;
  if (organizationSlug !== "acme") return null;
  if (siteSlug === "private") {
    return {
      organization: {
        id: "audit-organization",
        name: "Acme",
        slug: "acme",
      },
      site: {
        _id: "audit-private-site",
        name: "Private Handbook",
        slug: "private",
        visibility: "private",
        settings: {},
        updatedAt: 1_700_000_100_000,
      },
      page: null,
      content: { type: "doc", version: 1, content: [] },
      navigation: [],
      access: { status: "forbidden", visibility: "private" },
      canonicalUrlInputs: {
        organizationSlug: "acme",
        siteSlug: "private",
        pagePath,
      },
      updatedAt: 1_700_000_100_000,
    };
  }
  if (siteSlug !== undefined && siteSlug !== "handbook") return null;

  const page = pages.find(
    (candidate) => candidate.path.join("/") === pagePath.join("/"),
  );
  if (!page) return null;

  const navigation = pages.map((candidate, index) => ({
    _id: candidate.id,
    siteId: "audit-site",
    title: candidate.title,
    slug: candidate.slug,
    order: index,
    children: [],
  }));

  return {
    organization: {
      id: "audit-organization",
      name: "Acme",
      slug: "acme",
    },
    site: {
      _id: "audit-site",
      name: "Acme Handbook",
      slug: "handbook",
      visibility: "public",
      settings: {},
      updatedAt: 1_700_000_100_000,
    },
    page: {
      _id: page.id,
      title: page.title,
      slug: page.slug,
      isOpenEditorPageBlock: false,
      updatedAt: page.updatedAt,
    },
    content: {
      type: "doc",
      version: 1,
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: page.text }],
        },
      ],
    },
    navigation,
    access: { status: "accessible", visibility: "public" },
    canonicalUrlInputs: {
      organizationSlug: "acme",
      siteSlug: "handbook",
      pagePath: [...page.path],
    },
    updatedAt: page.updatedAt,
  };
}
