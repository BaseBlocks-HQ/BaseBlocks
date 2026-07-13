"use client";

import type { QuicklinkItem } from "@baseblocks/domain";
import { AppWindow, ArrowUpRight, Link2 } from "lucide-react";
import Image from "next/image";

export function readQuickLinks(value: unknown): QuicklinkItem[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const link = item as Partial<QuicklinkItem>;
    if (
      typeof link.id !== "string" ||
      typeof link.title !== "string" ||
      typeof link.url !== "string"
    )
      return [];
    return [
      {
        id: link.id,
        title: link.title,
        url: link.url,
        linkType: link.linkType === "app" ? "app" : "website",
        ...(typeof link.imageUrl === "string" && link.imageUrl
          ? { imageUrl: link.imageUrl }
          : {}),
      },
    ];
  });
}

function safeHref(link: QuicklinkItem) {
  const url = link.url.trim();
  if (!url) return null;
  if (link.linkType === "app") {
    return /^[a-z][a-z\d+.-]*:\/\//i.test(url) &&
      !/^(?:javascript|data|vbscript):/i.test(url)
      ? url
      : null;
  }
  if (url.startsWith("/") && !url.startsWith("//")) return url;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:"
      ? url
      : null;
  } catch {
    return null;
  }
}

export function QuickLinksViewer({ links }: { links: QuicklinkItem[] }) {
  return (
    <section className="not-prose my-4 grid gap-3 sm:grid-cols-2">
      {links.map((link) => {
        const href = safeHref(link);
        if (!href) return null;
        let destination = "Website";
        if (link.linkType === "app") destination = "Open app";
        else if (href.startsWith("/")) destination = "BaseBlocks page";
        else {
          try {
            destination = new URL(href).hostname.replace(/^www\./, "");
          } catch {}
        }
        return (
          <a
            className="group flex min-w-0 items-center gap-3 rounded-2xl bg-card p-3 transition hover:-translate-y-0.5 hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            href={href}
            key={link.id}
            {...(link.linkType === "app" || href.startsWith("/")
              ? {}
              : { rel: "noopener noreferrer", target: "_blank" })}
          >
            <span className="relative isolate flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary/10 text-primary [&>img]:!m-0 [&>img]:!size-full [&>img]:!max-w-none [&>img]:!object-cover">
              {link.imageUrl ? (
                <Image
                  alt=""
                  className="object-cover"
                  fill
                  sizes="44px"
                  src={link.imageUrl}
                  style={{ objectFit: "cover" }}
                  unoptimized
                />
              ) : link.linkType === "app" ? (
                <AppWindow className="size-5" />
              ) : (
                <Link2 className="size-5" />
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">
                {link.title || "Untitled link"}
              </span>
              <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                {destination}
              </span>
            </span>
            <ArrowUpRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </a>
        );
      })}
    </section>
  );
}
