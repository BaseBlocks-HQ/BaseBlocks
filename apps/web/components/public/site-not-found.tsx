"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getDisplayDomain } from "@/lib/utils";

interface SiteNotFoundProps {
  subdomain: string;
}

export function SiteNotFound({ subdomain }: SiteNotFoundProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Site Not Found</h1>
        <p className="text-muted-foreground mb-8">
          The site at <strong>{getDisplayDomain(subdomain)}</strong> doesn&apos;t
          exist.
        </p>
        <Button asChild>
          <Link href="/">Go to BaseBlocks</Link>
        </Button>
      </div>
    </div>
  );
}
