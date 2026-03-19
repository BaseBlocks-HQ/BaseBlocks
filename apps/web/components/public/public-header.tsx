import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { landingFonts } from "@/modules/landing/constants";
import { Button } from "@baseblocks/ui/button";
import { Github } from "lucide-react";
import type { ReactNode } from "react";
import { PublicHeaderBlur } from "./public-header-blur";

interface PublicHeaderProps {
  authAction: ReactNode;
  className?: string;
  contentClassName?: string;
  docsLabel: string;
  homepageLinkLabel?: string;
  showDocsLink?: boolean;
  showHomepageLink?: boolean;
}

export function PublicHeader({
  authAction,
  className,
  contentClassName,
  docsLabel,
  homepageLinkLabel,
  showDocsLink = true,
  showHomepageLink = false,
}: PublicHeaderProps) {
  return (
    <header className={cn("sticky top-0 z-50", className)}>
      <div className="relative isolate">
        <PublicHeaderBlur />
        <div className="absolute inset-0 bg-linear-to-b from-background/78 via-background/42 to-background/8 dark:from-background/86 dark:via-background/52 dark:to-background/12" />
        <div
          className={cn(
            "relative mx-auto flex min-h-[calc(4rem_+_env(safe-area-inset-top))] max-w-6xl items-center justify-between px-6 pt-[env(safe-area-inset-top)]",
            contentClassName,
          )}
        >
          <div className="relative flex w-full items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <Link href="/">
                <div className="flex items-center gap-2.5">
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground text-sm text-background"
                    style={{ fontFamily: landingFonts.square }}
                  >
                    B
                  </div>
                  <span
                    className="whitespace-nowrap tracking-tight"
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
                <>
                  <Link href="/">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground"
                    >
                      {homepageLinkLabel ?? "Homepage"}
                    </Button>
                  </Link>
                </>
              ) : null}
            </div>

            <div className="flex items-center gap-4">
              <a
                href="https://github.com/naaiyy/BaseBlocks"
                target="_blank"
                rel="noopener noreferrer"
                className="hidden text-sm text-muted-foreground transition-colors hover:text-foreground sm:inline-flex sm:items-center sm:gap-1.5"
              >
                <Github className="h-4 w-4" />
                GitHub
              </a>
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
