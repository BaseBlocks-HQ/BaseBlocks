import { PublicFooter } from "@/modules/marketing/components/public-footer";
import type { TranslateFn } from "@/modules/marketing/landing/types";
import type { ReactNode } from "react";
import { Reveal } from "./reveal";

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
