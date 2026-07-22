import { BlurStack } from "@baseblocks/ui/blur-stack";
import { marketingActionClassName } from "./marketing-action";
import { optimizedImageUrl } from "./optimized-image-url";

interface LandingHeaderProps {
  labels: { docs: string; legal: string; signIn: string };
  locale: "en" | "fr";
}

export function LandingHeader({ labels, locale }: LandingHeaderProps) {
  const prefix = locale === "fr" ? "/fr" : "";
  const authAction = (
    <a
      className={marketingActionClassName({
        size: "sm",
        variant: "default",
      })}
      href={`${prefix}/login`}
    >
      {labels.signIn}
    </a>
  );

  return (
    <header className="landing-header sticky top-0 z-50 [--bb-header-height:3.5rem]">
      <div className="relative isolate">
        <BlurStack className="inset-x-0 top-0 h-full" direction="down" />
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
          <div className="relative flex h-14 min-w-0 w-full items-center justify-between gap-2 sm:gap-4">
            <div className="flex min-w-0 items-center gap-1.5 sm:gap-2.5">
              <a href={prefix || "/"} aria-label="BaseBlocks">
                <div className="flex min-w-0 items-center gap-2 sm:gap-2.5">
                  {/* biome-ignore lint/performance/noImgElement: This uses the Next optimizer URL without its client runtime. */}
                  <img
                    src={optimizedImageUrl("/brand/baseblocks-logo.png", 64)}
                    alt=""
                    width={32}
                    height={32}
                    className="h-8 w-8 shrink-0 object-contain"
                    decoding="async"
                  />
                  <span className="landing-pixel-square text-[0.9375rem] leading-none tracking-tight max-[22rem]:hidden">
                    BaseBlocks
                  </span>
                </div>
              </a>
            </div>

            <div className="flex shrink-0 items-center gap-1 sm:gap-4">
              <a
                className={marketingActionClassName({
                  size: "sm",
                  variant: "ghost",
                })}
                href={`${prefix}/docs`}
              >
                {labels.docs}
              </a>
              <a
                className={marketingActionClassName({
                  size: "sm",
                  variant: "ghost",
                })}
                href={`${prefix}/legal`}
              >
                {labels.legal}
              </a>
              {authAction}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
