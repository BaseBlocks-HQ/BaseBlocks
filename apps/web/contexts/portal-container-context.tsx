"use client";

import { createContext, useContext } from "react";

const PortalContainerContext = createContext<HTMLElement | undefined>(undefined);

export function usePortalContainer() {
  return useContext(PortalContainerContext);
}

export const PortalContainerProvider = PortalContainerContext.Provider;
