"use client";

import { PublicSiteShell } from "@/features/published-sites/shell";
import { getDisplayDomain } from "@/features/published-sites/urls";
import { Link } from "@/i18n/navigation";
import type { PublishedPageResult } from "./read-model";
import { Button } from "@baseblocks/ui/button";
import { Lock } from "lucide-react";
import { useTranslations } from "next-intl";

type Props = {
  result: PublishedPageResult | null;
  organizationSlug: string;
};

export function PublicSite({ result, organizationSlug }: Props) {
  if (!result) {
    return (
      <PublicSiteState kind="site-not-found" teamSlug={organizationSlug} />
    );
  }

  const visibility = result.access.visibility;
  if (visibility === "private") {
    return <PublicSiteState kind="site-private" siteName={result.site.name} />;
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
