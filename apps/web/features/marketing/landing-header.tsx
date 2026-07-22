import { Link } from "@/i18n/navigation";
import { BlurStack } from "@baseblocks/ui/blur-stack";
import { Button } from "@baseblocks/ui/button";
import Image from "next/image";

interface LandingHeaderProps {
  labels: { docs: string; legal: string; signIn: string };
}

export function LandingHeader({ labels }: LandingHeaderProps) {
  const authAction = (
    <Button asChild size="sm" className="rounded-full">
      <Link href="/login">{labels.signIn}</Link>
    </Button>
  );

  return (
    <header className="z-50 [--bb-header-height:3.5rem] max-sm:absolute max-sm:inset-x-0 max-sm:top-0 sm:sticky sm:top-0">
      <div className="relative isolate">
        <div className="max-sm:hidden">
          <BlurStack className="inset-x-0 top-0 h-full" direction="down" />
        </div>
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
                    sizes="32px"
                    className="h-8 w-8 shrink-0 object-contain"
                  />
                  <span className="landing-pixel-square hidden text-[0.9375rem] leading-none tracking-tight sm:inline">
                    BaseBlocks
                  </span>
                </div>
              </Link>
            </div>

            <div className="flex shrink-0 items-center gap-1 sm:gap-4">
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="hidden rounded-full sm:inline-flex"
              >
                <Link href="/docs">{labels.docs}</Link>
              </Button>
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="hidden rounded-full sm:inline-flex"
              >
                <Link href="/legal">{labels.legal}</Link>
              </Button>
              {authAction}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
