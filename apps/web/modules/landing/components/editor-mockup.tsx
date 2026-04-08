"use client";

import { landingEditorPreviewImages } from "@/modules/landing/constants";
import Image from "next/image";

export function EditorMockup() {
  return (
    <div className="relative select-none">
      <Image
        src={landingEditorPreviewImages.light}
        alt="BaseBlocks editor showing a site with dashboard, table, and rich text blocks"
        className="relative rounded-xl border border-neutral-200 shadow-2xl lg:rounded-r-none lg:border-r-0 dark:hidden dark:border-white/[0.1] dark:lg:border-r-0"
        priority
        sizes="(max-width: 1024px) 100vw, 58vw"
        width={3420}
        height={1950}
      />
      <Image
        src={landingEditorPreviewImages.dark}
        alt="BaseBlocks editor showing a site with dashboard, table, and rich text blocks"
        className="relative hidden rounded-xl border border-neutral-200 shadow-2xl lg:rounded-r-none lg:border-r-0 dark:block dark:border-white/[0.1] dark:lg:border-r-0"
        priority
        sizes="(max-width: 1024px) 100vw, 58vw"
        width={3420}
        height={1950}
      />
    </div>
  );
}
