"use client";
import { SLUG_PATTERN, generateSlug } from "@/lib/validation";
import { api } from "@repo/backend";
import type { Id } from "@repo/backend";
import { Input } from "@repo/ui/input";
import { Label } from "@repo/ui/label";
import { useMutation } from "convex/react";
import { useState } from "react";
import { FormDialog } from "./form-dialog";

interface CreateSubPageDialogProps {
  siteId: string;
  parentId: string;
  parentTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function CreateSubPageDialog({
  siteId,
  parentId,
  parentTitle,
  open,
  onOpenChange,
  onSuccess,
}: CreateSubPageDialogProps) {
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const createPage = useMutation(api.pages.mutations.create);

  const handleTitleChange = (value: string) => {
    setTitle(value);
    setSlug(generateSlug(value));
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      await createPage({
        siteId: siteId as Id<"sites">,
        title,
        slug,
        parentId: parentId as Id<"pages">,
      });
      onOpenChange(false);
      setTitle("");
      setSlug("");
      onSuccess?.();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to create sub-page";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setTitle("");
      setSlug("");
      setError("");
    }
    onOpenChange(newOpen);
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={handleOpenChange}
      title="Create Sub-page"
      description={`Add a new page under "${parentTitle}"`}
      onSubmit={handleSubmit}
      isSubmitting={isSubmitting}
      submitLabel="Create Page"
      submittingLabel="Creating..."
    >
      <div className="space-y-2">
        <Label htmlFor="subPageTitle">Page Title</Label>
        <Input
          id="subPageTitle"
          placeholder="Getting Started"
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="subPageSlug">URL Slug</Label>
        <Input
          id="subPageSlug"
          placeholder="getting-started"
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
