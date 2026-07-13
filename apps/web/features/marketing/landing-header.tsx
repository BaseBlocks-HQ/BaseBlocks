import { Link } from "@/i18n/navigation";
import { BlurStack } from "@baseblocks/ui/blur-stack";
import { Button } from "@baseblocks/ui/button";
import Image from "next/image";

type TranslateFn = (key: string) => string;

interface LandingHeaderProps {
  authenticatedHref: string | null;
  commonTranslations: TranslateFn;
  navigationTranslations: TranslateFn;
}

export function LandingHeader({
  authenticatedHref,
  commonTranslations,
  navigationTranslations,
}: LandingHeaderProps) {
  const authAction = (
    <Link href={authenticatedHref ?? "/login"}>
      <Button size="sm" className="rounded-full">
        {commonTranslations(authenticatedHref ? "goToDashboard" : "signIn")}
      </Button>
    </Link>
  );

  return (
    <header className="z-50 [--bb-header-height:3.5rem] max-sm:absolute max-sm:inset-x-0 max-sm:top-0 sm:sticky sm:top-0">
      <div className="relative isolate">
        <div className="max-sm:hidden">
          <BlurStack className="inset-x-0 top-0 h-full" direction="down" />
        </div>
        <div className="absolute inset-0 bg-linear-to-b from-background/78 via-background/42 to-background/8 max-sm:hidden dark:from-background/86 dark:via-background/52 dark:to-background/12" />
        <div className="relative mx-auto max-w-6xl px-5 pt-[42px] sm:px-6 sm:pt-0">
          <div className="relative flex h-12 min-w-0 w-full items-center justify-between gap-2 sm:h-14 sm:gap-4">
            <div className="flex min-w-0 items-center gap-1.5 sm:gap-2.5">
              <Link href="/" aria-label="BaseBlocks">
                <div className="flex min-w-0 items-center gap-2 sm:gap-2.5">
                  <Image
                    src="/brand/baseblocks-logo.png"
                    alt=""
                    width={600}
                    height={600}
                    priority
                    sizes="32px"
                    className="h-8 w-8 shrink-0 object-contain"
                  />
                  <span
                    className="hidden tracking-tight min-[380px]:inline"
                    style={{
                      fontFamily: "var(--font-geist-pixel-square)",
                      fontSize: "0.9375rem",
                      lineHeight: 1,
                    }}
                  >
                    BaseBlocks
                  </span>
                </div>
              </Link>
            </div>

            <div className="flex shrink-0 items-center gap-1 sm:gap-4">
              <Link href="/docs">
                <Button variant="ghost" size="sm" className="rounded-full">
                  {navigationTranslations("docs")}
                </Button>
              </Link>
              <Link href="/legal">
                <Button variant="ghost" size="sm" className="rounded-full">
                  {navigationTranslations("legal")}
                </Button>
              </Link>
              {authAction}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
