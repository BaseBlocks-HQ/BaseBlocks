import type { Locale } from "@baseblocks/i18n";
import type { ReactNode } from "react";
import { DeferredLandingControls } from "./deferred-landing-controls";
import type { LandingCopy } from "./landing-page";

interface FooterSectionProps {
  authCta: ReactNode;
  copy: LandingCopy;
  labels: {
    selectLanguage: string;
    themeDark: string;
    themeLight: string;
    themeSystem: string;
  };
  locale: Locale;
}

export function FooterSection({
  authCta,
  copy,
  labels,
  locale,
}: FooterSectionProps) {
  return (
    <footer className="landing-footer">
      <div className="landing-rail">
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

        <div className="landing-footer-base">
          <div className="landing-footer-brand">
            <div className="landing-footer-brand-lockup">
              {/* biome-ignore lint/performance/noImgElement: This local SVG logo does not need image optimization. */}
              <img
                className="landing-brand-mark landing-brand-mark-footer"
                src="/brand/baseblocks-mark.svg"
                alt=""
                width="270"
                height="228"
              />
              <div>
                <strong>BaseBlocks</strong>
                <span>{copy.footerCopyright}</span>
              </div>
            </div>
          </div>

          <div className="landing-footer-controls">
            <DeferredLandingControls labels={labels} locale={locale} />
            <a
              href="https://github.com/naaiyy/BaseBlocks"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
