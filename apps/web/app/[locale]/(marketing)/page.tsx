import {
  LandingPage,
  type LandingCopy,
} from "@/features/marketing/landing-page";
import { getMarketingOrigin } from "@/lib/seo/site-url";
import type { Locale } from "@baseblocks/i18n";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

type Props = { params: Promise<{ locale: Locale }> };

const MARKETING_ORIGIN = getMarketingOrigin();
const OG_IMAGE = `${MARKETING_ORIGIN}/opengraph-image`;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const canonical = locale === "fr" ? "/fr" : "/";
  return {
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
  "ctaSubtitle",
  "ctaTitle",
  "editorDesc",
  "editorTitle",
  "featuresLabel",
  "featuresSubtitle",
  "featuresTitle",
  "filesSearchDesc",
  "filesSearchTitle",
  "footerCopyright",
  "getStarted",
  "pageTreeDesc",
  "pageTreeTitle",
  "publishingDesc",
  "publishingTitle",
  "step1Desc",
  "step1ImageAlt",
  "step1Title",
  "step2Desc",
  "step2ImageAlt",
  "step2Title",
  "step3Desc",
  "step3ImageAlt",
  "step3Title",
  "stepsLabel",
  "stepsTitle",
  "teamWorkspacesDesc",
  "teamWorkspacesTitle",
  "viewDocs",
] as const satisfies readonly (keyof LandingCopy)[];

export default async function Page({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [landing, common, language, navigation] = await Promise.all([
    getTranslations({ locale, namespace: "landing" }),
    getTranslations({ locale, namespace: "common" }),
    getTranslations({ locale, namespace: "language" }),
    getTranslations({ locale, namespace: "navigation" }),
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
          legal: navigation("legal"),
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
