"use client";

import { BlurStack } from "@baseblocks/ui/blur-stack";
import { type ReactNode, createContext, use, useState } from "react";
import { createPortal } from "react-dom";

const AppHeaderContext = createContext<HTMLElement | null>(null);

export function AppHeaderProvider({ children }: { children: ReactNode }) {
  const [host, setHost] = useState<HTMLElement | null>(null);

  return (
    <AppHeaderContext.Provider value={host}>
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden [--app-header-height:3.875rem]">
        <header
          className="@container/header absolute inset-x-0 top-0 z-40 h-(--app-header-height) isolate"
          ref={setHost}
        >
          <BlurStack className="inset-x-0 top-0 h-full" direction="down" />
          <div className="pointer-events-none absolute inset-0 bg-linear-to-b from-background/78 via-background/42 to-background/8 dark:from-background/86 dark:via-background/52 dark:to-background/12" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-linear-to-r from-transparent via-foreground/10 to-transparent" />
        </header>
        {children}
      </div>
    </AppHeaderContext.Provider>
  );
}

export function AppHeaderPortal({ children }: { children: ReactNode }) {
  const host = use(AppHeaderContext);
  return host ? createPortal(children, host) : null;
}
