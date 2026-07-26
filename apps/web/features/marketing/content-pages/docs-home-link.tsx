"use client";

import type { ComponentProps } from "react";

export function DocsHomeLink(props: ComponentProps<"a">) {
  return (
    <a {...props}>
      {/* biome-ignore lint/performance/noImgElement: This local SVG logo does not need image optimization. */}
      <img
        alt=""
        className="bb-docs-brand-mark"
        height="228"
        src="/brand/baseblocks-mark.svg"
        width="270"
      />
      <span>BaseBlocks</span>
    </a>
  );
}
