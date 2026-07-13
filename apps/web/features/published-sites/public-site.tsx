"use client";

import { AccessGate } from "@/features/published-sites/access-gate";
import { PublicSiteShell } from "@/features/published-sites/shell";
import { getDisplayDomain } from "@/features/published-sites/urls";
import { Link } from "@/i18n/navigation";
import { getStoredAccessSessionTokens } from "./access-session";
import type { PublishedPageResult } from "./read-model";
import { api } from "@baseblocks/backend";
import { Button } from "@baseblocks/ui/button";
import { Spinner } from "@baseblocks/ui/spinner";
import { useQuery } from "convex/react";
import { Lock } from "lucide-react";
import { useTranslations } from "next-intl";

type Props = {
  result: PublishedPageResult | null;
  organizationSlug: string;
  siteSlug?: string;
  pagePath: string[];
};

export function PublicSite({
  result,
  organizationSlug,
  siteSlug,
  pagePath,
}: Props) {
  if (!result) {
    return (
      <PublicSiteState kind="site-not-found" teamSlug={organizationSlug} />
    );
  }

  const visibility = result.access.visibility;
  if (visibility === "private") {
    return <PublicSiteState kind="site-private" siteName={result.site.name} />;
  }

  if (visibility === "password") {
    return (
      <AccessGate siteId={result.site._id} siteName={result.site.name}>
        <UnlockedPublicSite
          organizationSlug={organizationSlug}
          siteSlug={siteSlug ?? result.site.slug}
          pagePath={pagePath}
        />
      </AccessGate>
    );
  }

  return <ResolvedPublicSite result={result} />;
}

function UnlockedPublicSite({
  organizationSlug,
  siteSlug,
  pagePath,
}: {
  organizationSlug: string;
  siteSlug: string;
  pagePath: string[];
}) {
  const result = useQuery(api.published.resolve, {
    organizationSlug,
    siteSlug,
    pagePath,
    sessionTokens: getStoredAccessSessionTokens(),
  });

  if (result === undefined) return <PublicSiteState kind="loading" />;
  if (!result) {
    return (
      <PublicSiteState kind="site-not-found" teamSlug={organizationSlug} />
    );
  }
  return <ResolvedPublicSite result={result} />;
}

function ResolvedPublicSite({ result }: { result: PublishedPageResult }) {
  if (result.access.status === "forbidden") {
    return <PublicSiteState kind="page-forbidden" />;
  }
  if (result.access.status === "missing") {
    return <PublicSiteState kind="page-not-found" />;
  }
  if (!result.page) return <PublicSiteState kind="empty" />;
  return <PublicSiteShell result={result} />;
}

type PublicSiteStateKind =
  | "loading"
  | "site-not-found"
  | "site-private"
  | "page-not-found"
  | "page-forbidden"
  | "empty";

function PublicSiteState({
  kind,
  siteName,
  teamSlug,
}: {
  kind: PublicSiteStateKind;
  siteName?: string;
  teamSlug?: string;
}) {
  const t = useTranslations("errors");

  if (kind === "loading") {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <Spinner className="size-6 text-muted-foreground" />
      </div>
    );
  }

  if (kind === "site-private") {
    return (
      <CenteredState>
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <Lock className="h-8 w-8 text-muted-foreground" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {siteName ? `${siteName} is private` : "This site is private"}
        </h1>
        <p className="max-w-md text-muted-foreground">
          This site is only accessible to team members. Please contact the site
          owner if you need access.
        </p>
      </CenteredState>
    );
  }

  if (kind === "page-forbidden") {
    return (
      <CenteredState>
        <h1 className="text-2xl font-semibold tracking-tight">
          This page is restricted
        </h1>
        <p className="text-muted-foreground">
          You must have access to view this page.
        </p>
        <Button asChild>
          <Link href="/login" target="_blank" rel="noreferrer">
            Log in
          </Link>
        </Button>
      </CenteredState>
    );
  }

  if (kind === "site-not-found") {
    return (
      <CenteredState>
        <h1 className="text-4xl font-bold">{t("siteNotFound")}</h1>
        <p className="text-muted-foreground">
          {t("siteNotFoundDescription")}{" "}
          {teamSlug ? <strong>{getDisplayDomain(teamSlug)}</strong> : null}
        </p>
        <Button asChild>
          <Link href="/">BaseBlocks</Link>
        </Button>
      </CenteredState>
    );
  }

  if (kind === "empty") {
    return (
      <CenteredState>
        <p className="text-muted-foreground">
          No accessible pages are available on this site yet.
        </p>
      </CenteredState>
    );
  }

  return (
    <CenteredState>
      <p className="text-muted-foreground">Page not found</p>
    </CenteredState>
  );
}

function CenteredState({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6 text-center">
      <div className="space-y-4">{children}</div>
    </div>
  );
}
