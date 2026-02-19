import { useLayoutContext } from "@/components/elements/layout-context";
import type { ElementRendererProps } from "@/components/elements/registry";
import type { QuicklinkItem } from "@/types/elements";
import { AppWindow, ExternalLink } from "lucide-react";

function QuicklinkButton({ link }: { link: QuicklinkItem }) {
  if (!link.url) return null;

  const isApp = link.linkType === "app";

  return (
    <a
      href={link.url}
      {...(isApp ? {} : { target: "_blank", rel: "noopener noreferrer" })}
      className="group flex flex-col items-center gap-2 p-4 rounded-xl border bg-card hover:bg-primary/5 hover:border-primary/30 transition-all duration-200"
    >
      <div className="w-12 h-12 rounded-lg overflow-hidden bg-primary/10 flex items-center justify-center flex-shrink-0">
        {link.imageUrl ? (
          <img
            src={link.imageUrl}
            alt={link.title || "Link"}
            className="w-full h-full object-cover"
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

  // Sidebar: single column
  // Main content: flex wrap, centered, max 5 per row
  return (
    <div
      className={
        isSidebar
          ? "flex flex-col gap-3 my-6"
          : "flex flex-wrap justify-center gap-3 my-6"
      }
    >
      {validLinks.map((link) => (
        <div key={link.id} className={isSidebar ? "" : "w-[calc(20%-10px)]"}>
          <QuicklinkButton link={link} />
        </div>
      ))}
    </div>
  );
}
