"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import type { ReactNode } from "react";

// Get the Convex URL - this is inlined at build time
const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

// Show a clear error if the URL is not configured
if (!convexUrl) {
  // This will be visible both in console and in the UI
  console.error(
    "[FATAL] NEXT_PUBLIC_CONVEX_URL is not set! " +
    "Make sure this environment variable is configured in Vercel."
  );
}

// Create client only if URL is available
const convex = convexUrl ? new ConvexReactClient(convexUrl) : null;

export default function PublicLayout({ children }: { children: ReactNode }) {
  // Show visible error if Convex is not configured
  if (!convex) {
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
            Please set this environment variable in your Vercel project settings
            and redeploy.
          </p>
        </div>
      </div>
    );
  }

  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}
