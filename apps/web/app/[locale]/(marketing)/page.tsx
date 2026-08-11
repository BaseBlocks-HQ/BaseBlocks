import {
  LandingPage,
  type LandingCopy,
} from "@/features/marketing/landing-page";
import { getMarketingOrigin, getMarketingSiteUrl } from "@/lib/seo/site-url";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";

const MARKETING_ORIGIN = getMarketingOrigin();
const MARKETING_SITE_URL = getMarketingSiteUrl();
const OG_IMAGE = `${MARKETING_ORIGIN}/opengraph-image?v=2`;

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const canonical = locale === "fr" ? "/fr" : "/";
  return {
    metadataBase: MARKETING_SITE_URL,
    title: "BaseBlocks - Idea to site in minutes",
    description:
      "Build, publish, and share internal sites in minutes. BaseBlocks is a collaborative site builder for teams.",
    openGraph: {
      url: canonical,
      images: [{ url: OG_IMAGE, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      images: [OG_IMAGE],
    },
    alternates: {
      canonical,
      languages: { en: "/", fr: "/fr", "x-default": "/" },
    },
  };
}

const landingKeys = [
  "brandingDesc",
  "brandingTitle",
  "ctaTitle",
  "editorDesc",
  "editorTitle",
  "featuresSubtitle",
  "featuresTitle",
  "filesSearchDesc",
  "filesSearchTitle",
  "footerCookies",
  "footerCopyright",
  "footerDocsOverview",
  "footerDocumentation",
  "footerLegal",
  "footerLegalNotice",
  "footerLegalOverview",
  "footerQuickStart",
  "getStarted",
  "heroDescription",
  "heroTitle",
  "pageTreeDesc",
  "pageTreeTitle",
  "publishingDesc",
  "publishingTitle",
  "step1Desc",
  "step1Title",
  "step3Desc",
  "step3Title",
  "stepsTitle",
  "teamWorkspacesDesc",
  "teamWorkspacesTitle",
  "viewDocs",
] as const satisfies readonly (keyof LandingCopy)[];

export default async function Page() {
  const locale = await getLocale();
  const [landing, common, language, navigation] = await Promise.all([
    getTranslations("landing"),
    getTranslations("common"),
    getTranslations("language"),
    getTranslations("navigation"),
  ]);
  const copy = Object.fromEntries(
    landingKeys.map((key) => [key, landing(key)]),
  ) as LandingCopy;

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "BaseBlocks",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description:
      "A collaborative site builder for teams to build, publish, and share internal sites.",
    url: MARKETING_ORIGIN,
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  };

  return (
    <>
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: Static application-owned JSON-LD, escaped above.
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
        }}
      />
      <LandingPage
        copy={copy}
        locale={locale}
        labels={{
          docs: navigation("docs"),
          selectLanguage: language("select"),
          signIn: common("signIn"),
          themeDark: common("themeDark"),
          themeLight: common("themeLight"),
          themeSystem: common("themeSystem"),
        }}
      />
    </>
  );
}
