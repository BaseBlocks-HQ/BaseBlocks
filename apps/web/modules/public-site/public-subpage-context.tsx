"use client";

import { type ReactNode, createContext, use, useState } from "react";

interface ViewingSubpage {
  pageId: string;
  searchTerm?: string;
}

interface PublicSubpageContextValue {
  viewingSubpage: ViewingSubpage | null;
  openSubpage: (pageId: string, options?: { searchTerm?: string }) => void;
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

  const openSubpage = (
    pageId: string,
    options?: { searchTerm?: string },
  ) => {
    const trimmedSearchTerm = options?.searchTerm?.trim();
    setViewingSubpage({
      pageId,
      searchTerm: trimmedSearchTerm || undefined,
    });
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
  const context = use(PublicSubpageContext);
  if (!context) {
    throw new Error(
      "usePublicSubpageContext must be used within a PublicSubpageProvider",
    );
  }
  return context;
}

export function usePublicSubpageContextOptional() {
  return use(PublicSubpageContext);
}
