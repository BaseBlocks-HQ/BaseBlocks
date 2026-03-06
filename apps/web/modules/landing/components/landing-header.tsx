import { Link } from "@/i18n/navigation";
import { landingFonts, layoutSpring } from "@/modules/landing/constants";
import type { TranslateFn } from "@/modules/landing/types";
import { Button } from "@baseblocks/ui/button";
import { Github } from "lucide-react";
import { m } from "motion/react";

interface LandingHeaderProps {
  isAuthenticated: boolean;
  commonTranslations: TranslateFn;
  navigationTranslations: TranslateFn;
}

export function LandingHeader({
  isAuthenticated,
  commonTranslations,
  navigationTranslations,
}: LandingHeaderProps) {
  return (
    <header className="sticky top-0 z-50">
      <div className="bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2.5">
            <m.div
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground text-sm text-background"
              style={{ fontFamily: landingFonts.square }}
              initial={{ opacity: 0, scale: 0.7, filter: "blur(4px)" }}
              animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
              transition={{ duration: 0.8, ease: [0.2, 0.65, 0.3, 0.9] }}
            >
              B
            </m.div>
            <m.span
              layoutId="brand"
              transition={layoutSpring}
              className="whitespace-nowrap tracking-tight"
              style={{
                fontFamily: landingFonts.square,
                fontSize: "0.9375rem",
                lineHeight: 1,
              }}
            >
              BaseBlocks
            </m.span>
          </div>

          <m.div
            className="flex items-center gap-4"
            initial={{ opacity: 0, y: 5, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{
              duration: 1,
              ease: [0.2, 0.65, 0.3, 0.9],
              delay: 0.15,
            }}
          >
            <a
              href="https://github.com/naaiyy/BaseBlocks"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden text-sm text-muted-foreground transition-colors hover:text-foreground sm:inline-flex sm:items-center sm:gap-1.5"
            >
              <Github className="h-4 w-4" />
              GitHub
            </a>
            {isAuthenticated ? (
              <Link href="/dashboard">
                <Button size="sm">{navigationTranslations("dashboard")}</Button>
              </Link>
            ) : (
              <Link href="/login">
                <Button size="sm">{commonTranslations("signIn")}</Button>
              </Link>
            )}
          </m.div>
        </div>
      </div>
      <m.div
        className="h-px bg-gradient-to-r from-transparent via-border/60 to-transparent dark:via-white/[0.06]"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
      />
    </header>
  );
}
