"use client";

import { BlurStack } from "@baseblocks/ui/blur-stack";
import { type ReactNode, createContext, use, useState } from "react";
import { createPortal } from "react-dom";

const AppHeaderContext = createContext<HTMLElement | null>(null);

export function AppHeaderProvider({ children }: { children: ReactNode }) {
  const [host, setHost] = useState<HTMLElement | null>(null);

  return (
    <AppHeaderContext.Provider value={host}>
      <header
        className="@container/header relative z-40 h-14 shrink-0"
        ref={setHost}
      >
        <BlurStack className="inset-x-0 top-0 h-full" direction="down" />
        <div className="absolute inset-0 bg-linear-to-b from-background/90 via-background/72 to-background/48 dark:from-background/94 dark:via-background/78 dark:to-background/54" />
      </header>
      {children}
    </AppHeaderContext.Provider>
  );
}

export function AppHeaderPortal({ children }: { children: ReactNode }) {
  const host = use(AppHeaderContext);
  return host ? createPortal(children, host) : null;
}
