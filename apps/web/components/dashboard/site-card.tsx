"use client";

import { useState } from "react";
import Link from "next/link";
import { ExternalLink, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "@repo/backend";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EditSiteDialog } from "@/components/dialogs/edit-site-dialog";
import { ConfirmDialog } from "@/components/dialogs/confirm-dialog";
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
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const deleteSite = useMutation(api.sites.mutations.remove);

  // Link to the site root - the root page will redirect to the default page
  const siteUrl = getSiteUrl(companySlug);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteSite({ siteId: site._id as any });
      setDeleteOpen(false);
    } catch (err) {
      console.error("Failed to delete site:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Card className="hover:border-primary/50 transition-colors">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg truncate">{site.name}</CardTitle>
              <CardDescription className="truncate">
                {site.description || "No description"}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div
                className={`px-2 py-1 text-xs rounded-full whitespace-nowrap ${
                  site.isPublished
                    ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                    : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300"
                }`}
              >
                {site.isPublished ? "Published" : "Draft"}
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                    <span className="sr-only">Open menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setEditOpen(true)}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit Details
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setDeleteOpen(true)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Site
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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

      <EditSiteDialog open={editOpen} onOpenChange={setEditOpen} site={site} />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Site"
        description={
          <>
            Are you sure you want to delete <strong>{site.name}</strong>? This
            will permanently delete all pages, blocks, and documents associated
            with this site. This action cannot be undone.
          </>
        }
        confirmLabel={isDeleting ? "Deleting..." : "Delete Site"}
        variant="destructive"
        onConfirm={handleDelete}
      />
    </>
  );
}
