import { marketingActionClassName } from "./marketing-action";

interface LandingHeaderProps {
  labels: { docs: string; signIn: string };
  locale: "en" | "fr";
}

export function LandingHeader({ labels, locale }: LandingHeaderProps) {
  const prefix = locale === "fr" ? "/fr" : "";
  const authAction = (
    <a
      className={marketingActionClassName({
        size: "compact",
        variant: "default",
      })}
      href={`${prefix}/login`}
    >
      {labels.signIn}
    </a>
  );

  return (
    <header className="landing-header">
      <div className="landing-rail landing-header-grid">
        <a className="landing-header-brand" href={prefix || "/"}>
          {/* biome-ignore lint/performance/noImgElement: This local SVG logo does not need image optimization. */}
          <img
            className="landing-brand-mark"
            src="/brand/baseblocks-mark.svg"
            alt=""
            width="270"
            height="228"
          />
          BaseBlocks
        </a>

        <nav className="landing-header-nav" aria-label="Primary">
          <a href={`${prefix}/docs`}>{labels.docs}</a>
        </nav>

        <div className="landing-header-actions">{authAction}</div>
      </div>
    </header>
  );
}
