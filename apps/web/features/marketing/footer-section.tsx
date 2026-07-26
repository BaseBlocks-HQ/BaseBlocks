import type { ReactNode } from "react";
import { FooterGradient } from "./footer-gradient";
import type { LandingCopy } from "./landing-page";

interface FooterSectionProps {
  authCta: ReactNode;
  copy: LandingCopy;
  locale: "en" | "fr";
}

export function FooterSection({ authCta, copy, locale }: FooterSectionProps) {
  const prefix = locale === "fr" ? "/fr" : "";

  return (
    <footer className="landing-footer">
      <div className="landing-footer-gradient">
        <FooterGradient />
      </div>

      <div className="landing-rail landing-footer-content">
        <div className="landing-footer-cta">
          <div>
            {/* biome-ignore lint/performance/noImgElement: This local SVG logo does not need image optimization. */}
            <img
              className="landing-brand-mark landing-footer-cta-mark"
              src="/brand/baseblocks-mark.svg"
              alt=""
              width="270"
              height="228"
            />
            <h2>{copy.ctaTitle}</h2>
          </div>
          <div className="landing-footer-actions">
            <div>{authCta}</div>
          </div>
        </div>

        <nav className="landing-footer-navigation" aria-label="Footer">
          <section>
            <h3>{copy.footerDocumentation}</h3>
            <a href={`${prefix}/docs`}>{copy.footerDocsOverview}</a>
            <a href={`${prefix}/docs/quick-start`}>{copy.footerQuickStart}</a>
            <a href="https://github.com/naaiyy/BaseBlocks">GitHub</a>
          </section>

          <section>
            <h3>{copy.footerLegal}</h3>
            <a href={`${prefix}/docs/legal`}>{copy.footerLegalOverview}</a>
            <a href={`${prefix}/docs/legal/cookie-policy`}>
              {copy.footerCookies}
            </a>
            <a href={`${prefix}/docs/legal/legal-notice`}>
              {copy.footerLegalNotice}
            </a>
          </section>
        </nav>

        <div className="landing-footer-base">
          <div className="landing-footer-brand-lockup">
            {/* biome-ignore lint/performance/noImgElement: This local SVG logo does not need image optimization. */}
            <img
              className="landing-brand-mark landing-brand-mark-footer"
              src="/brand/baseblocks-mark.svg"
              alt=""
              width="270"
              height="228"
            />
            <strong>BaseBlocks</strong>
          </div>
          <span className="landing-footer-license">{copy.footerCopyright}</span>
        </div>
      </div>
    </footer>
  );
}
