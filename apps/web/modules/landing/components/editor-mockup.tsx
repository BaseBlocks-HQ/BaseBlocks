import { landingEditorPreviewImage } from "@/modules/landing/constants";
import Image from "next/image";

export function EditorMockup() {
  return (
    <div className="relative select-none">
      <Image
        src={landingEditorPreviewImage}
        alt="BaseBlocks editor showing a site with dashboard, table, and rich text blocks"
        className="relative rounded-xl border border-neutral-200 shadow-2xl lg:rounded-r-none lg:border-r-0 dark:border-white/[0.1] dark:lg:border-r-0"
        preload
        sizes="(max-width: 1024px) 100vw, 58vw"
        placeholder="blur"
      />
    </div>
  );
}
