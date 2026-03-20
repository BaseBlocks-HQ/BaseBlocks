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
  mobileActions,
  showDocsLink = true,
  showHomepageLink = false,
}: PublicHeaderProps) {
  return (
    <header
      className={cn("sticky top-0 z-50 [--bb-header-height:3.5rem]", className)}
    >
      <div className="relative isolate">
        <PublicHeaderBlur />
        <div className="absolute inset-0 bg-linear-to-b from-background/78 via-background/42 to-background/8 dark:from-background/86 dark:via-background/52 dark:to-background/12" />
        <div
          className={cn(
            "relative mx-auto flex min-h-(--bb-header-height) max-w-6xl items-center justify-between px-4 sm:px-6",
            contentClassName,
          )}
        >
          <div className="relative flex min-w-0 w-full items-center justify-between gap-2 sm:gap-4">
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
