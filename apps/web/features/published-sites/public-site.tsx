"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight01Icon, LockIcon } from "@hugeicons/core-free-icons";
import { PublicSiteShell } from "@/features/published-sites/shell";
import { getDisplayDomain } from "@/features/published-sites/urls";
import { getMarketingSiteUrl } from "@/lib/seo/site-url";
import type {
  PublishedPageResolution,
  PublishedPageResult,
} from "./read-model";
import { Button } from "@baseblocks/ui/button";
import { useTranslations } from "next-intl";

type Props = {
  result: PublishedPageResolution | null;
  organizationSlug: string;
  privateAccessUrl: string | null;
};

function isAccessibleResult(
  result: PublishedPageResolution,
): result is PublishedPageResult {
  return result.access.status === "accessible";
}

export function PublicSite({
  result,
  organizationSlug,
  privateAccessUrl,
}: Props) {
  if (!result) {
    return (
      <PublicSiteState kind="site-not-found" teamSlug={organizationSlug} />
    );
  }
  if (isAccessibleResult(result)) {
    return <ResolvedPublicSite result={result} />;
  }

  if (result.access.status === "authentication-required") {
    return (
      <PrivateSiteGate
        kind="authentication-required"
        privateAccessUrl={privateAccessUrl}
      />
    );
  }
  if (result.access.status === "forbidden") {
    return (
      <PrivateSiteGate kind="forbidden" privateAccessUrl={privateAccessUrl} />
    );
  }
  if (result.access.status === "missing") {
    return <PublicSiteState kind="page-not-found" />;
  }

  return <PublicSiteState kind="site-not-found" />;
}

function ResolvedPublicSite({ result }: { result: PublishedPageResult }) {
  if (!result.page) return <PublicSiteState kind="empty" />;
  return <PublicSiteShell result={result} />;
}

type PublicSiteStateKind = "site-not-found" | "page-not-found" | "empty";

function PublicSiteState({
  kind,
  teamSlug,
}: {
  kind: PublicSiteStateKind;
  teamSlug?: string;
}) {
  const t = useTranslations("errors");

  if (kind === "site-not-found") {
    return (
      <CenteredState>
        <h1 className="text-4xl font-bold">{t("siteNotFound")}</h1>
        <p className="text-muted-foreground">
          {t("siteNotFoundDescription")}{" "}
          {teamSlug ? <strong>{getDisplayDomain(teamSlug)}</strong> : null}
        </p>
        <Button asChild>
          <a href={getMarketingSiteUrl().toString()}>BaseBlocks</a>
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

function PrivateSiteGate({
  kind,
  privateAccessUrl,
}: {
  kind: "authentication-required" | "forbidden";
  privateAccessUrl: string | null;
}) {
  const t = useTranslations("errors");
  const openSignIn = () => {
    const signInUrl = new URL("/login", getMarketingSiteUrl());
    signInUrl.searchParams.set("redirectTo", window.location.href);
    window.location.assign(signInUrl);
  };

  return (
    <CenteredState>
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted">
        <HugeiconsIcon
          icon={LockIcon}
          className="h-8 w-8 text-muted-foreground"
        />
      </div>
      <h1 className="text-2xl font-semibold tracking-tight">
        {kind === "forbidden"
          ? t("privateSiteForbiddenTitle")
          : t("privateSiteTitle")}
      </h1>
      <p className="max-w-md text-muted-foreground">
        {privateAccessUrl
          ? t("privateSiteCustomDomainDescription")
          : kind === "forbidden"
            ? t("privateSiteForbiddenDescription")
            : t("privateSiteDescription")}
      </p>
      {privateAccessUrl ? (
        <Button asChild>
          <a href={privateAccessUrl}>
            {t("privateSiteOpenSecureUrl")}
            <HugeiconsIcon icon={ArrowRight01Icon} className="size-4" />
          </a>
        </Button>
      ) : kind === "authentication-required" ? (
        <Button onClick={openSignIn}>
          {t("privateSiteSignIn")}
          <HugeiconsIcon icon={ArrowRight01Icon} className="size-4" />
        </Button>
      ) : (
        <Button asChild variant="outline">
          <a href={getMarketingSiteUrl().toString()}>{t("privateSiteBack")}</a>
        </Button>
      )}
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
