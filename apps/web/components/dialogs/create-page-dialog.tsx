"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SLUG_PATTERN, generateSlug } from "@/lib/validation";
import { api } from "@repo/backend";
import type { Id } from "@repo/backend";
import { useMutation } from "convex/react";
import { Plus } from "lucide-react";
import { useState } from "react";
import { FormDialog } from "./form-dialog";

interface CreatePageDialogProps {
  siteId: string;
  parentId?: string;
}

export function CreatePageDialog({ siteId, parentId }: CreatePageDialogProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createPage = useMutation(api.pages.mutations.create);

  const handleTitleChange = (value: string) => {
    setTitle(value);
    setSlug(generateSlug(value));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await createPage({
        siteId: siteId as Id<"sites">,
        title,
        slug,
        parentId: parentId as Id<"pages"> | undefined,
      });
      setOpen(false);
      setTitle("");
      setSlug("");
    } catch (err) {
      console.error("Failed to create page:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={setOpen}
      title="Create New Page"
      description="Add a new page to your site"
      trigger={
        <Button variant="ghost" size="icon" className="h-6 w-6">
          <Plus className="h-4 w-4" />
        </Button>
      }
      onSubmit={handleSubmit}
      isSubmitting={isSubmitting}
      submitLabel="Create Page"
      submittingLabel="Creating..."
    >
      <div className="space-y-2">
        <Label htmlFor="pageTitle">Page Title</Label>
        <Input
          id="pageTitle"
          placeholder="Getting Started"
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="pageSlug">URL Slug</Label>
        <Input
          id="pageSlug"
          placeholder="getting-started"
          value={slug}
          onChange={(e) => setSlug(e.target.value.toLowerCase())}
          required
          pattern={SLUG_PATTERN}
        />
      </div>
    </FormDialog>
  );
}
