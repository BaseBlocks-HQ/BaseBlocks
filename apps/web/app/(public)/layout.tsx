"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { type ReactNode, useEffect, useState } from "react";

// Get the Convex URL - this is inlined at build time
const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

console.log("========== PUBLIC LAYOUT MODULE LOAD ==========");
console.log("[PUBLIC_LAYOUT] convexUrl:", convexUrl);
console.log("[PUBLIC_LAYOUT] typeof convexUrl:", typeof convexUrl);
console.log("[PUBLIC_LAYOUT] window defined:", typeof window !== "undefined");

// Show a clear error if the URL is not configured
if (!convexUrl) {
  console.error("[PUBLIC_LAYOUT] FATAL: NEXT_PUBLIC_CONVEX_URL is not set!");
}

// Create client only if URL is available
let convex: ConvexReactClient | null = null;
if (convexUrl) {
  console.log("[PUBLIC_LAYOUT] Creating ConvexReactClient...");
  try {
    convex = new ConvexReactClient(convexUrl);
    console.log("[PUBLIC_LAYOUT] ConvexReactClient created successfully");
    console.log("[PUBLIC_LAYOUT] convex instance:", convex);
  } catch (error) {
    console.error("[PUBLIC_LAYOUT] Error creating ConvexReactClient:", error);
  }
} else {
  console.error("[PUBLIC_LAYOUT] Skipping client creation - no URL");
}

export default function PublicLayout({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    console.log("========== PUBLIC LAYOUT MOUNTED ==========");
    console.log("[PUBLIC_LAYOUT] useEffect running");
    console.log("[PUBLIC_LAYOUT] convex client exists:", !!convex);
    console.log("[PUBLIC_LAYOUT] convexUrl in effect:", convexUrl);
    setMounted(true);

    // Check if we're on client
    if (typeof window !== "undefined") {
      console.log("[PUBLIC_LAYOUT] Running in browser");
      console.log("[PUBLIC_LAYOUT] window.location:", window.location.href);
    }
  }, []);

  console.log("[PUBLIC_LAYOUT] Rendering, mounted:", mounted, "convex:", !!convex);

  // Show visible error if Convex is not configured
  if (!convex) {
    console.error("[PUBLIC_LAYOUT] Rendering error state - no convex client");
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50 p-8">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">
            Configuration Error
          </h1>
          <p className="text-red-700 mb-4">
            NEXT_PUBLIC_CONVEX_URL is not configured.
          </p>
          <p className="text-sm text-red-600">
            URL value: {String(convexUrl)}
          </p>
        </div>
      </div>
    );
  }

  return (
    <ConvexProvider client={convex}>
      {/* Debug info */}
      <div id="convex-debug" style={{ display: "none" }} data-url={convexUrl} data-mounted={String(mounted)} />
      {children}
    </ConvexProvider>
  );
}
