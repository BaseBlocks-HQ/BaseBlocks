import { AnimatePresence, type MotionValue, m } from "motion/react";
import type { RefObject } from "react";

interface IntroOverlayProps {
  expanded: boolean;
  titleRef: RefObject<HTMLSpanElement | null>;
  fontSizeRem: MotionValue<string>;
  brandFontFamily: string;
}

export function IntroOverlay({
  expanded,
  titleRef,
  fontSizeRem,
  brandFontFamily,
}: IntroOverlayProps) {
  return (
    <AnimatePresence>
      {!expanded && (
        <m.div
          key="intro"
          className="fixed inset-0 z-50 flex items-center justify-center bg-background"
          exit={{
            opacity: 0,
            transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
          }}
        >
          <m.span
            layoutId="brand"
            ref={titleRef}
            className="whitespace-nowrap will-change-transform"
            style={{
              fontSize: fontSizeRem,
              fontFamily: brandFontFamily,
              lineHeight: 1,
              userSelect: "none",
            }}
          >
            BaseBlocks
          </m.span>
        </m.div>
      )}
    </AnimatePresence>
  );
}
