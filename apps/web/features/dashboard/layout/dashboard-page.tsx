"use client";

import { AppHeaderPortal } from "@/features/app-shell/app-header";
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
    <AppHeaderPortal>
      <div className="relative flex h-full w-full items-center px-4 sm:px-6">
        <div className="mx-auto flex w-full max-w-[64rem] items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-2">
            {showSidebarTrigger ? (
              <SidebarTrigger
                aria-label={t("toggleSidebar")}
                className="size-7 shrink-0 rounded-lg"
                title={t("toggleSidebar")}
              />
            ) : null}
            <h1 className="brand-display truncate text-2xl leading-none font-normal tracking-[-0.025em]">
              {title}
            </h1>
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      </div>
    </AppHeaderPortal>
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
