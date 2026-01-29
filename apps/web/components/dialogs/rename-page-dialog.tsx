"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SLUG_PATTERN, generateSlug } from "@/lib/validation";
import type { PageListItem } from "@/types";
import { api } from "@repo/backend";
import type { Id } from "@repo/backend";
import { useMutation } from "convex/react";
import { useEffect, useState } from "react";
import { FormDialog } from "./form-dialog";

interface RenamePageDialogProps {
  page: PageListItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RenamePageDialog({
  page,
  open,
  onOpenChange,
}: RenamePageDialogProps) {
  const [title, setTitle] = useState(page.title);
  const [slug, setSlug] = useState(page.slug);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updatePage = useMutation(api.pages.mutations.update);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setTitle(page.title);
      setSlug(page.slug);
    }
  }, [open, page.title, page.slug]);

  const handleTitleChange = (value: string) => {
    setTitle(value);
    setSlug(generateSlug(value));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await updatePage({
        pageId: page._id as Id<"pages">,
        title,
        slug,
      });
      onOpenChange(false);
    } catch (err) {
      console.error("Failed to rename page:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Rename Page"
      description="Update the title and URL slug for this page"
      onSubmit={handleSubmit}
      isSubmitting={isSubmitting}
      submitLabel="Save Changes"
      submittingLabel="Saving..."
    >
      <div className="space-y-2">
        <Label htmlFor="renameTitle">Page Title</Label>
        <Input
          id="renameTitle"
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="renameSlug">URL Slug</Label>
        <Input
          id="renameSlug"
          value={slug}
          onChange={(e) => setSlug(e.target.value.toLowerCase())}
          required
          pattern={SLUG_PATTERN}
        />
      </div>
    </FormDialog>
  );
}
