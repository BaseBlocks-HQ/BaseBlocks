"use client";

import { cn } from "@baseblocks/ui/lib/utils";
import { SidebarTrigger, useSidebar } from "@baseblocks/ui/sidebar";
import { useTranslations } from "next-intl";
import type { ComponentProps, ReactNode } from "react";

export function DashboardPageHeader({
  action,
  title,
}: {
  action?: ReactNode;
  title: ReactNode;
}) {
  const t = useTranslations("navigation");
  const { isMobile, openMobile, state } = useSidebar();
  const showSidebarTrigger = isMobile ? !openMobile : state === "collapsed";

  return (
    <header className="relative mb-8 flex flex-wrap items-center justify-between gap-4 pb-5 after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-gradient-to-r after:from-transparent after:via-foreground/10 after:to-transparent">
      <div className="flex min-w-0 items-center gap-2">
        {showSidebarTrigger ? (
          <SidebarTrigger
            aria-label={t("toggleSidebar")}
            className="size-7 shrink-0 rounded-lg"
            title={t("toggleSidebar")}
          />
        ) : null}
        <h1 className="brand-display text-4xl leading-none font-normal tracking-[-0.03em] text-balance">
          {title}
        </h1>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}

export function DashboardList({
  children,
  className,
  ...props
}: ComponentProps<"div">) {
  return (
    <div className={cn("space-y-2", className)} {...props}>
      {children}
    </div>
  );
}

export function DashboardListRow({
  children,
  className,
  ...props
}: ComponentProps<"article">) {
  return (
    <article
      className={cn(
        "group/dashboard-row relative flex min-h-[4.25rem] flex-wrap items-center gap-3 rounded-xl bg-card px-3.5 py-2.5 transition-shadow duration-150 hover:shadow-sm sm:flex-nowrap",
        className,
      )}
      {...props}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[inherit] bg-muted/0 transition-colors duration-150 group-hover/dashboard-row:bg-muted/30"
      />
      {children}
    </article>
  );
}
