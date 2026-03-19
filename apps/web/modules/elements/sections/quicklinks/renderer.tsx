import { useLayoutContext } from "@/modules/elements/framework/layout-context";
import type { ElementRendererProps } from "@/modules/elements/framework/registry";
import type { QuicklinkItem } from "@baseblocks/types/elements";
import { AppWindow, ExternalLink } from "lucide-react";
import Image from "next/image";

function getSafeHref(url: string, linkType?: string): string | undefined {
  if (!url) return undefined;
  // App URL schemes (e.g. spotify://, slack://) are intentional — pass through
  if (linkType === "app") return url;
  if (url.startsWith("/")) return url;
  try {
    const { protocol } = new URL(url);
    return protocol === "https:" || protocol === "http:" ? url : undefined;
  } catch {
    return undefined;
  }
}

function QuicklinkButton({ link }: { link: QuicklinkItem }) {
  if (!link.url) return null;

  const safeHref = getSafeHref(link.url, link.linkType);
  if (!safeHref) return null;

  const isApp = link.linkType === "app";

  return (
    <a
      href={safeHref}
      {...(isApp ? {} : { target: "_blank", rel: "noopener noreferrer" })}
      className="group w-full flex flex-col items-center gap-2 p-4 rounded-xl border bg-card hover:bg-primary/5 hover:border-primary/30 transition-all duration-200"
    >
      <div className="not-prose relative w-12 h-12 rounded-lg overflow-hidden bg-primary/10 flex items-center justify-center flex-shrink-0">
        {link.imageUrl ? (
          <Image
            src={link.imageUrl}
            alt={link.title || "Link"}
            fill
            unoptimized
            sizes="48px"
            className="object-cover"
          />
        ) : isApp ? (
          <AppWindow className="w-5 h-5 text-primary/70" />
        ) : (
          <ExternalLink className="w-5 h-5 text-primary/70" />
        )}
      </div>
      <span className="text-sm font-medium text-center line-clamp-2 group-hover:text-primary">
        {link.title || "Untitled"}
      </span>
    </a>
  );
}

export function QuicklinksRenderer({
  content,
}: ElementRendererProps<"quicklinks">) {
  const layoutContext = useLayoutContext();
  const isSidebar = layoutContext?.isSidebar ?? false;

  const validLinks = (content.links || []).filter((link) => link.url);

  if (validLinks.length === 0) {
    return null;
  }

  if (isSidebar) {
    return (
      <div className="flex flex-col gap-3 my-6">
        {validLinks.map((link) => (
          <QuicklinkButton key={link.id} link={link} />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap justify-center gap-3 my-6">
      {validLinks.map((link) => (
        <div key={link.id} className="w-[calc(20%-10px)]">
          <QuicklinkButton link={link} />
        </div>
      ))}
    </div>
  );
}
