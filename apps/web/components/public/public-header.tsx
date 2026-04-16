import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { landingFonts } from "@/modules/landing/constants";
import { Button } from "@baseblocks/ui/button";
import { Github, House } from "lucide-react";
import type { ReactNode } from "react";
import { PublicHeaderBlur } from "./public-header-blur";

interface PublicHeaderProps {
  authAction: ReactNode;
  className?: string;
  contentClassName?: string;
  docsLabel: string;
  homepageLinkLabel?: string;
  mobileChromeMode?: "default" | "overlay";
  mobileActions?: ReactNode;
  showDocsLink?: boolean;
  showHomepageLink?: boolean;
}

export function PublicHeader({
  authAction,
  className,
  contentClassName,
  docsLabel,
  homepageLinkLabel,
  mobileChromeMode = "default",
  mobileActions,
  showDocsLink = true,
  showHomepageLink = false,
}: PublicHeaderProps) {
  const isMobileOverlay = mobileChromeMode === "overlay";

  return (
    <header
      className={cn(
        "z-50 [--bb-header-height:3.5rem]",
        isMobileOverlay
          ? "max-sm:absolute max-sm:inset-x-0 max-sm:top-0 sm:sticky sm:top-0"
          : "sticky top-0",
        className,
      )}
    >
      <div className="relative isolate">
        <div className={cn(isMobileOverlay && "max-sm:hidden")}>
          <PublicHeaderBlur />
        </div>
        <div
          className={cn(
            "absolute inset-0 bg-linear-to-b from-background/78 via-background/42 to-background/8 dark:from-background/86 dark:via-background/52 dark:to-background/12",
            isMobileOverlay && "max-sm:hidden",
          )}
        />
        <div
          className={cn(
            "relative mx-auto max-w-6xl px-4 sm:px-6",
            isMobileOverlay && "max-sm:px-5 max-sm:pt-[42px]",
            contentClassName,
          )}
        >
          <div
            className={cn(
              "relative flex h-14 min-w-0 w-full items-center justify-between gap-2 sm:gap-4",
              isMobileOverlay && "max-sm:h-12",
            )}
          >
            <div className="flex min-w-0 items-center gap-1.5 sm:gap-2.5">
              <Link href="/">
                <div className="flex min-w-0 items-center gap-2 sm:gap-2.5">
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground text-sm text-background"
                    style={{ fontFamily: landingFonts.square }}
                  >
                    B
                  </div>
                  <span
                    className="hidden tracking-tight min-[380px]:inline"
                    style={{
                      fontFamily: landingFonts.square,
                      fontSize: "0.9375rem",
                      lineHeight: 1,
                    }}
                  >
                    BaseBlocks
                  </span>
                </div>
              </Link>
              {showHomepageLink ? (
                <Link href="/">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground max-sm:size-8 max-sm:px-0 max-[360px]:hidden"
                  >
                    <House className="h-4 w-4 shrink-0 sm:hidden" />
                    <span className="max-sm:sr-only">
                      {homepageLinkLabel ?? "Homepage"}
                    </span>
                  </Button>
                </Link>
              ) : null}
            </div>

            <div className="flex shrink-0 items-center gap-1 sm:gap-4">
              {mobileActions}
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="text-muted-foreground max-sm:size-8 max-sm:px-0 max-[360px]:hidden"
              >
                <a
                  href="https://github.com/naaiyy/BaseBlocks"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Github className="h-4 w-4 shrink-0" />
                  <span className="max-sm:sr-only">GitHub</span>
                </a>
              </Button>
              {showDocsLink ? (
                <Link href="/docs">
                  <Button variant="outline" size="sm">
                    {docsLabel}
                  </Button>
                </Link>
              ) : null}
              {authAction}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
