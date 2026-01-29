import { ExternalLink } from "lucide-react";
import type { BlockRendererBaseProps } from "../types";
import type { QuicklinksContent, QuicklinkItem } from "@/types";

interface QuicklinkButtonProps {
  link: QuicklinkItem;
}

function QuicklinkButton({ link }: QuicklinkButtonProps) {
  if (!link.url) return null;

  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col items-center gap-2 p-4 rounded-xl border bg-card hover:bg-accent hover:border-accent-foreground/20 transition-all duration-200 min-w-[140px] flex-1 max-w-[200px]"
    >
      {/* Image or placeholder */}
      <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted flex items-center justify-center flex-shrink-0">
        {link.imageUrl ? (
          <img
            src={link.imageUrl}
            alt={link.title || "Link"}
            className="w-full h-full object-cover"
          />
        ) : (
          <ExternalLink className="w-5 h-5 text-muted-foreground" />
        )}
      </div>

      {/* Title */}
      <span className="text-sm font-medium text-center line-clamp-2 group-hover:text-accent-foreground">
        {link.title || "Untitled"}
      </span>
    </a>
  );
}

export function QuicklinksRenderer({ block }: BlockRendererBaseProps) {
  const content = block.content as QuicklinksContent;
  const links = content.links || [];

  // Filter out links without URLs
  const validLinks = links.filter((link) => link.url);

  if (validLinks.length === 0) {
    return null;
  }

  return (
    <div className="my-6">
      <div className="flex flex-wrap gap-3 justify-start">
        {validLinks.map((link) => (
          <QuicklinkButton key={link.id} link={link} />
        ))}
      </div>
    </div>
  );
}
