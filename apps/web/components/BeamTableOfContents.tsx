"use client";

import { cn } from "@/lib/utils";
import { I18nLabel } from "fumadocs-ui/contexts/i18n";
import { AlignLeft } from "lucide-react";
import { startTransition, useEffect, useMemo, useState } from "react";

type HeadingTag = "H2" | "H3" | "H4" | "H5" | "H6";

type BeamHeading = {
  id: string;
  isLast: boolean;
  level: number;
  nextLevel?: number;
  prevLevel: number;
  title: string;
};

const headingSelector = "#nd-page :is(h2,h3,h4,h5,h6)[id]";
const paddingBase = 14;
const paddingStep = 12;
const railStep = 10;
const railLevelCap = 1;

// Failure modes:
// - Generated Fumadocs TOC can flatten or omit deeper headings
// - Heading ids must be read from the rendered page to match scroll spy targets
// - Headings can change after hydration, so the TOC needs to rescan the DOM

function getHeadingLevel(tagName: HeadingTag) {
  return Number(tagName.slice(1));
}

function toBeamHeadings(elements: HTMLHeadingElement[]): BeamHeading[] {
  if (elements.length === 0) {
    return [];
  }

  const minLevel = elements.reduce(
    (currentMin, heading) =>
      Math.min(currentMin, getHeadingLevel(heading.tagName as HeadingTag)),
    Number.POSITIVE_INFINITY,
  );

  return elements.map((heading, index) => {
    const currentLevel = getHeadingLevel(heading.tagName as HeadingTag);
    const prev = elements[index - 1];
    const next = elements[index + 1];

    return {
      id: heading.id,
      isLast: index === elements.length - 1,
      level: currentLevel - minLevel,
      nextLevel: next
        ? getHeadingLevel(next.tagName as HeadingTag) - minLevel
        : undefined,
      prevLevel: prev
        ? getHeadingLevel(prev.tagName as HeadingTag) - minLevel
        : 0,
      title: heading.textContent?.trim() ?? heading.id,
    };
  });
}

function readRenderedHeadings() {
  if (typeof document === "undefined") {
    return [];
  }

  const elements = Array.from(
    document.querySelectorAll<HTMLHeadingElement>(headingSelector),
  );

  return toBeamHeadings(elements);
}

function useRenderedHeadings() {
  const [headings, setHeadings] = useState<BeamHeading[]>([]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      startTransition(() => {
        setHeadings(readRenderedHeadings());
      });
    });

    const page = document.getElementById("nd-page");
    if (!page) {
      return () => window.cancelAnimationFrame(frame);
    }

    const observer = new MutationObserver(() => {
      startTransition(() => {
        setHeadings(readRenderedHeadings());
      });
    });

    observer.observe(page, {
      childList: true,
      subtree: true,
    });

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

  return headings;
}

function useActiveHeadingIds(ids: string[]) {
  const [activeIds, setActiveIds] = useState<Set<string>>(() => new Set());
  const emptyActiveIds = useMemo(() => new Set<string>(), []);

  useEffect(() => {
    if (ids.length === 0) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        setActiveIds((previousIds) => {
          const nextIds = new Set(previousIds);

          for (const entry of entries) {
            if (entry.isIntersecting) {
              nextIds.add(entry.target.id);
            } else {
              nextIds.delete(entry.target.id);
            }
          }

          return nextIds;
        });
      },
      {
        rootMargin: "-80px 0px -20% 0px",
      },
    );

    const elements = ids.flatMap((id) => {
      const element = document.getElementById(id);
      return element ? [element] : [];
    });

    for (const element of elements) {
      observer.observe(element);
    }

    return () => observer.disconnect();
  }, [ids]);

  return ids.length === 0 ? emptyActiveIds : activeIds;
}

function BeamTocItem({
  id,
  isActive,
  isLast,
  level,
  nextLevel,
  prevLevel,
  title,
}: BeamHeading & { isActive: boolean }) {
  const paddingStart = paddingBase + level * paddingStep;
  const effectiveLevel = Math.min(level, railLevelCap);
  const effectivePrevLevel = Math.min(prevLevel, railLevelCap);
  const nextEffectiveLevel =
    nextLevel === undefined ? undefined : Math.min(nextLevel, railLevelCap);
  const lineX = effectiveLevel * railStep;
  const prevLineX = effectivePrevLevel * railStep;
  const hasDiagonal = effectiveLevel !== effectivePrevLevel;
  const topClass = hasDiagonal ? "top-1.5" : "top-0";
  const bottomClass =
    isLast ||
    (nextEffectiveLevel !== undefined && nextEffectiveLevel !== effectiveLevel)
      ? "bottom-1.5"
      : "bottom-0";

  return (
    <button
      type="button"
      data-active={isActive}
      className="group relative block w-full py-1.5 text-left outline-none"
      style={{ paddingInlineStart: `${paddingStart}px` }}
      onClick={() => {
        const element = document.getElementById(id);
        if (!element) {
          return;
        }

        window.scrollTo({
          top: element.offsetTop - 80,
          behavior: "smooth",
        });
      }}
    >
      {hasDiagonal ? (
        <div className="pointer-events-none absolute inset-0">
          <svg
            viewBox="0 0 16 16"
            className="absolute -top-1.5 size-4 rtl:-scale-x-100"
            style={{ insetInlineStart: 0 }}
          >
            <line
              x1={prevLineX}
              y1="0"
              x2={lineX}
              y2="12"
              className="stroke-fd-foreground/10"
              strokeWidth="1"
            />
            <line
              x1={prevLineX}
              y1="0"
              x2={lineX}
              y2="12"
              className={cn(
                "stroke-fd-foreground transition-opacity duration-300",
                isActive ? "opacity-35" : "opacity-0",
              )}
              strokeWidth="3"
              style={{ filter: "blur(1.5px)" }}
            />
            <line
              x1={prevLineX}
              y1="0"
              x2={lineX}
              y2="12"
              className={cn(
                "stroke-fd-foreground transition-opacity duration-300",
                isActive ? "opacity-100" : "opacity-0",
              )}
              strokeWidth="1.5"
            />
          </svg>
        </div>
      ) : null}

      <div
        className={cn(
          "absolute w-px bg-fd-foreground/10",
          topClass,
          bottomClass,
        )}
        style={{ insetInlineStart: `${lineX}px` }}
      >
        <div
          className={cn(
            "absolute inset-0 w-full origin-top bg-fd-foreground transition-[transform,opacity] duration-300 ease-out",
            "shadow-[0_0_14px_1px_rgba(0,0,0,0.16)] dark:shadow-[0_0_16px_1px_rgba(255,255,255,0.38)]",
            isActive ? "scale-y-100 opacity-100" : "scale-y-0 opacity-0",
          )}
        />
      </div>

      <span
        className={cn(
          "relative z-10 block truncate pe-2 text-sm transition-colors duration-200",
          isActive
            ? "font-medium text-fd-foreground"
            : "text-fd-muted-foreground group-hover:text-fd-foreground",
        )}
      >
        {title}
      </span>
    </button>
  );
}

export function BeamTableOfContents() {
  const headings = useRenderedHeadings();
  const headingIds = useMemo(
    () => headings.map((heading) => heading.id),
    [headings],
  );
  const activeIds = useActiveHeadingIds(headingIds);

  if (headings.length === 0) {
    return null;
  }

  return (
    <div
      id="nd-toc"
      className="sticky top-(--fd-docs-row-1) hidden h-[calc(var(--fd-docs-height)-var(--fd-docs-row-1))] w-(--fd-toc-width) flex-col pt-12 pe-4 pb-2 [grid-area:toc] xl:flex md:top-(--fd-docs-row-2) md:h-[calc(var(--fd-docs-height)-var(--fd-docs-row-2))]"
    >
      <h3
        id="toc-title"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-fd-foreground/80"
      >
        <AlignLeft className="size-4" />
        <I18nLabel label="toc" />
      </h3>

      <div className="relative mt-3 min-h-0 flex-1 overflow-auto py-3 text-sm [scrollbar-width:none] [mask-image:linear-gradient(to_bottom,transparent,white_16px,white_calc(100%-16px),transparent)] [&::-webkit-scrollbar]:hidden">
        <div className="flex flex-col">
          {headings.map((heading) => (
            <BeamTocItem
              key={heading.id}
              {...heading}
              isActive={activeIds.has(heading.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
