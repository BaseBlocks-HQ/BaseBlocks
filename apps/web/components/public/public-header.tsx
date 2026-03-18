import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { landingFonts } from "@/modules/landing/constants";
import { Button } from "@baseblocks/ui/button";
import { Github } from "lucide-react";
import type { ReactNode } from "react";

interface PublicHeaderProps {
  authAction: ReactNode;
  className?: string;
  contentClassName?: string;
  docsLabel: string;
  showDocsLink?: boolean;
}

export function PublicHeader({
  authAction,
  className,
  contentClassName,
  docsLabel,
  showDocsLink = true,
}: PublicHeaderProps) {
  return (
    <header className={cn("sticky top-0 z-50", className)}>
      <div className="bg-background/85 backdrop-blur-xl">
        <div
          className={cn(
            "mx-auto flex h-16 max-w-6xl items-center justify-between px-6",
            contentClassName,
          )}
        >
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
      <div className="h-px bg-gradient-to-r from-transparent via-border/60 to-transparent dark:via-white/[0.06]" />
    </header>
  );
}
