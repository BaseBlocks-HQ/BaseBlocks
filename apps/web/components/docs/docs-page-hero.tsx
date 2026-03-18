import { cn } from "@/lib/utils";
import { landingFonts } from "@/modules/landing/constants";

type DocsPageHeroProps = {
  description?: string;
  title: string;
};

export function DocsPageHero({ description, title }: DocsPageHeroProps) {
  return (
    <section className="bb-docs-hero relative overflow-hidden rounded-[1.75rem] border px-5 py-7 md:px-7 md:py-9">
      <div className="relative z-10">
        <div className="max-w-3xl">
          <h1
            className={cn(
              "text-4xl leading-[0.96] tracking-tight text-balance md:text-5xl",
            )}
            style={{ fontFamily: landingFonts.grid }}
          >
            {title}
          </h1>
          {description ? (
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg">
              {description}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
