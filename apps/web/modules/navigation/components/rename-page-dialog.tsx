"use client";

import { FormDialog } from "@/components/dialogs/form-dialog";
import { SLUG_PATTERN, generateSlug } from "@/lib/validation";
import { api } from "@baseblocks/backend";
import type { Id } from "@baseblocks/backend";
import type { PageListItem } from "@baseblocks/types";
import { Input } from "@baseblocks/ui/input";
import { Label } from "@baseblocks/ui/label";
import { useMutation } from "convex/react";
import { useEffect, useState } from "react";

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
  const [error, setError] = useState("");

  const updatePage = useMutation(api.pages.mutations.update);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setTitle(page.title);
      setSlug(page.slug);
      setError("");
    }
  }, [open, page.title, page.slug]);

  const handleTitleChange = (value: string) => {
    setTitle(value);
    setSlug(generateSlug(value));
    setError("");
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setError("");
    }
    onOpenChange(newOpen);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      await updatePage({
        pageId: page._id as Id<"pages">,
        title,
        slug,
      });
      onOpenChange(false);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to rename page";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={handleOpenChange}
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
          onChange={(e) => {
            setSlug(e.target.value.toLowerCase());
            setError("");
          }}
          required
          pattern={SLUG_PATTERN}
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </FormDialog>
  );
}
