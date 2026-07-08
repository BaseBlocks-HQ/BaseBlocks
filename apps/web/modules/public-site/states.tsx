"use client";

import { Link } from "@/i18n/navigation";
import { getDisplayDomain } from "@/lib/url";
import { Button } from "@baseblocks/ui/button";
import { Spinner } from "@baseblocks/ui/spinner";
import { Lock } from "lucide-react";
import { useTranslations } from "next-intl";

type PublicSiteStateKind =
  | "loading"
  | "site-not-found"
  | "site-not-published"
  | "site-private"
  | "page-not-found"
  | "page-forbidden"
  | "empty";

export function PublicSiteState({
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

  if (kind === "site-not-published") {
    return (
      <CenteredState>
        <h1 className="text-4xl font-bold">{t("siteNotPublished")}</h1>
        <p className="text-muted-foreground">
          {t("siteNotPublishedDescription")}
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
