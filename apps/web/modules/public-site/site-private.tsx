"use client";

import { Lock } from "lucide-react";

interface SitePrivateProps {
  siteName?: string;
}

export function SitePrivate({ siteName }: SitePrivateProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="text-center space-y-4">
        <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center">
          <Lock className="h-8 w-8 text-muted-foreground" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {siteName ? `${siteName} is private` : "This site is private"}
        </h1>
        <p className="text-muted-foreground max-w-md">
          This site is only accessible to team members. Please contact the site
          owner if you need access.
        </p>
      </div>
    </div>
  );
}
