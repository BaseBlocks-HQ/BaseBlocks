import { BrandLogoMark } from "@/modules/public-chrome/brand-logo";
import { LanguageSwitcher } from "@/modules/public-chrome/language-switcher";
import { ModeToggle } from "@/modules/public-chrome/mode-toggle";
import { cn } from "@/lib/utils";
import { landingFonts } from "@/modules/landing/constants";
import { Github } from "lucide-react";
import type { ReactNode } from "react";

interface PublicFooterProps {
  authCta: ReactNode;
  className?: string;
  contentClassName?: string;
  ctaSubtitle: string;
  ctaTitle: string;
  docsCta: ReactNode;
  footerCopyright: string;
  showCta?: boolean;
}

export function PublicFooter({
  authCta,
  className,
  contentClassName,
  ctaSubtitle,
  ctaTitle,
  docsCta,
  footerCopyright,
  showCta = true,
}: PublicFooterProps) {
  return (
    <footer
      className={cn(
        "border-t border-border/40 bg-muted/20 px-6 dark:border-white/[0.04] dark:bg-white/[0.015]",
        className,
      )}
    >
      <div className={cn("mx-auto max-w-6xl", contentClassName)}>
        {showCta ? (
          <div className="py-24 sm:py-32">
            <h2
              className="max-w-xl text-3xl tracking-tight sm:text-4xl"
              style={{ fontFamily: landingFonts.grid }}
            >
              {ctaTitle}
            </h2>
            <p className="mt-4 max-w-sm text-[0.94rem] text-muted-foreground">
              {ctaSubtitle}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {authCta}
              {docsCta}
            </div>
          </div>
        ) : null}

        <div className="border-t border-border/40 py-6 dark:border-white/[0.04]">
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2.5">
              <BrandLogoMark className="h-6 w-6" />
              <span className="text-xs text-muted-foreground/60">
                {footerCopyright}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-0.5">
                <LanguageSwitcher />
                <ModeToggle />
              </div>
              <a
                href="https://github.com/naaiyy/BaseBlocks"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                <Github className="h-3.5 w-3.5" />
                GitHub
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
