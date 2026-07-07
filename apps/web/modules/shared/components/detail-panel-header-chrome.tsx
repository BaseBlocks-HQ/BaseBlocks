"use client";

import { PublicHeaderBlur } from "@/modules/marketing/components/public-header-blur";

export function DetailPanelHeaderChrome({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative isolate overflow-hidden">
      <PublicHeaderBlur />
      <div className="absolute inset-0 bg-linear-to-b from-background/78 via-background/42 to-background/8 dark:from-background/86 dark:via-background/52 dark:to-background/12" />
      <div className="relative">{children}</div>
    </div>
  );
}
