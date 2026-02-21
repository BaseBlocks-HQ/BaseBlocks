"use client";

import { type ReactNode, createContext, useContext, useState } from "react";

export interface ViewingSubpage {
  pageId: string;
}

interface PublicSubpageContextValue {
  viewingSubpage: ViewingSubpage | null;
  openSubpage: (pageId: string) => void;
  closeSubpage: () => void;
}

const PublicSubpageContext = createContext<PublicSubpageContextValue | null>(
  null,
);

interface PublicSubpageProviderProps {
  children: ReactNode;
}

export function PublicSubpageProvider({
  children,
}: PublicSubpageProviderProps) {
  const [viewingSubpage, setViewingSubpage] = useState<ViewingSubpage | null>(
    null,
  );

  const openSubpage = (pageId: string) => {
    setViewingSubpage({ pageId });
  };

  const closeSubpage = () => {
    setViewingSubpage(null);
  };

  return (
    <PublicSubpageContext.Provider
      value={{
        viewingSubpage,
        openSubpage,
        closeSubpage,
      }}
    >
      {children}
    </PublicSubpageContext.Provider>
  );
}

export function usePublicSubpageContext() {
  const context = useContext(PublicSubpageContext);
  if (!context) {
    throw new Error(
      "usePublicSubpageContext must be used within a PublicSubpageProvider",
    );
  }
  return context;
}

export function usePublicSubpageContextOptional() {
  return useContext(PublicSubpageContext);
}
