import { PublicFooter } from "@/modules/public-site/chrome/public-footer";
import type { ReactNode } from "react";
import { Reveal } from "./reveal";

type TranslateFn = (key: string) => string;

interface FooterSectionProps {
  authCta: ReactNode;
  docsCta: ReactNode;
  landingTranslations: TranslateFn;
}

export function FooterSection({
  authCta,
  docsCta,
  landingTranslations,
}: FooterSectionProps) {
  return (
    <Reveal>
      <PublicFooter
        authCta={authCta}
        ctaSubtitle={landingTranslations("ctaSubtitle")}
        ctaTitle={landingTranslations("ctaTitle")}
        docsCta={docsCta}
        footerCopyright={landingTranslations("footerCopyright")}
      />
    </Reveal>
  );
}
