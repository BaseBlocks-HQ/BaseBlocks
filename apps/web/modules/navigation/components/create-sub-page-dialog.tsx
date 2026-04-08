"use client";
import { FormDialog } from "@/components/dialogs/form-dialog";
import { SLUG_PATTERN, generateSlug, uniqueSlugAmong } from "@/lib/validation";
import { api } from "@baseblocks/backend";
import type { Id } from "@baseblocks/backend";
import { Input } from "@baseblocks/ui/input";
import { Label } from "@baseblocks/ui/label";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";

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
  const [slugLockedByUser, setSlugLockedByUser] = useState(false);

  const createPage = useMutation(api.pages.mutations.create);
  const pages = useQuery(
    api.pages.queries.list,
    open ? { siteId: siteId as Id<"sites"> } : "skip",
  );
  const usedSlugs = new Set(
    (pages ?? []).map((page) => page.slug.toLowerCase()),
  );
  const autoSlug = uniqueSlugAmong(generateSlug(title), usedSlugs);
  const slugValue = slugLockedByUser ? slug : autoSlug;

  const handleTitleChange = (value: string) => {
    setSlugLockedByUser(false);
    setTitle(value);
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);
    void createPage({
      siteId: siteId as Id<"sites">,
      title,
      slug: slugValue,
      parentId: parentId as Id<"pages">,
    })
      .then(() => {
        onOpenChange(false);
        setSlugLockedByUser(false);
        setTitle("");
        setSlug("");
        onSuccess?.();
      })
      .catch((err) => {
        const message =
          err instanceof Error ? err.message : "Failed to create sub-page";
        setError(message);
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setSlugLockedByUser(false);
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
          value={slugValue}
          onChange={(e) => {
            setSlugLockedByUser(true);
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
