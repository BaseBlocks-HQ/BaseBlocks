"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getSiteUrl } from "@/lib/utils";

interface SiteCardProps {
  site: {
    _id: string;
    name: string;
    slug: string;
    description?: string;
    isPublished: boolean;
  };
  companySlug: string;
}

export function SiteCard({ site, companySlug }: SiteCardProps) {
  const siteUrl = getSiteUrl(companySlug, site.slug);

  return (
    <Card className="hover:border-primary/50 transition-colors">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{site.name}</CardTitle>
            <CardDescription>
              {site.description || "No description"}
            </CardDescription>
          </div>
          <div
            className={`px-2 py-1 text-xs rounded-full ${
              site.isPublished
                ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300"
            }`}
          >
            {site.isPublished ? "Published" : "Draft"}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2">
          <Link href={`/dashboard/sites/${site._id}`} className="flex-1">
            <Button variant="outline" className="w-full">
              Edit Site
            </Button>
          </Link>
          {site.isPublished && (
            <Button variant="ghost" size="icon" asChild>
              <a href={siteUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
