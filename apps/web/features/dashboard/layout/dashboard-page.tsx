"use client";

import { AppHeaderPortal } from "@/features/app-shell/app-header";
import { cn } from "@baseblocks/ui/lib/utils";
import { SidebarTrigger, useSidebar } from "@baseblocks/ui/sidebar";
import { Spinner } from "@baseblocks/ui/spinner";
import { useTranslations } from "next-intl";
import type { ComponentProps, ReactNode } from "react";

export function DashboardPage({
  children,
  className,
  ...props
}: ComponentProps<"main">) {
  return (
    <main
      className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 sm:px-6"
      {...props}
    >
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div
          className={cn(
            "mx-auto flex min-h-full w-full max-w-[64rem] flex-col pt-[calc(var(--app-header-height)+1.25rem)] pb-5",
            className,
          )}
        >
          {children}
        </div>
      </div>
    </main>
  );
}

export function DashboardPageState({
  className,
  ...props
}: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex min-h-0 flex-1 items-center justify-center",
        className,
      )}
      {...props}
    />
  );
}

export function DashboardPageLoadingState({
  label,
  ...props
}: Omit<ComponentProps<"div">, "children"> & { label?: string }) {
  return (
    <DashboardPageState aria-label={label} role="status" {...props}>
      <Spinner className="size-6 text-muted-foreground" />
    </DashboardPageState>
  );
}

export function DashboardPageEmptyState({
  message,
  ...props
}: Omit<ComponentProps<"div">, "children"> & { message: ReactNode }) {
  return (
    <DashboardPageState {...props}>
      <p className="text-center text-sm text-muted-foreground">{message}</p>
    </DashboardPageState>
  );
}

export function DashboardPageHeader({
  action,
  description,
  leading,
  title,
}: {
  action?: ReactNode;
  description?: ReactNode;
  leading?: ReactNode;
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
            {leading ? <div className="shrink-0">{leading}</div> : null}
            <div className="min-w-0">
              <h1 className="brand-display truncate text-2xl leading-none font-normal tracking-[-0.025em]">
                {title}
              </h1>
              {description ? (
                <div className="mt-1 text-xs leading-4 text-muted-foreground">
                  {description}
                </div>
              ) : null}
            </div>
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
