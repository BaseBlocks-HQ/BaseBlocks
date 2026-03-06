"use client";

import { FormDialog } from "@/components/dialogs/form-dialog";
import { SLUG_PATTERN, generateSlug } from "@/lib/validation";
import { api } from "@baseblocks/backend";
import type { Id } from "@baseblocks/backend";
import { Button } from "@baseblocks/ui/button";
import { Input } from "@baseblocks/ui/input";
import { Label } from "@baseblocks/ui/label";
import { useMutation } from "convex/react";
import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface CreatePageDialogProps {
  siteId: string;
  parentId?: string;
}

export function CreatePageDialog({ siteId, parentId }: CreatePageDialogProps) {
  const [dialogState, setDialogState] = useState({
    open: false,
    title: "",
    slug: "",
    isSubmitting: false,
    error: "",
  });

  const createPage = useMutation(api.pages.mutations.create);

  const handleTitleChange = (value: string) => {
    setDialogState((current) => ({
      ...current,
      title: value,
      slug: generateSlug(value),
      error: "",
    }));
  };

  const handleOpenChange = (newOpen: boolean) => {
    setDialogState((current) => ({
      ...current,
      open: newOpen,
    }));
    if (!newOpen) {
      setDialogState((current) => ({
        ...current,
        error: "",
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDialogState((current) => ({
      ...current,
      error: "",
      isSubmitting: true,
    }));

    try {
      await createPage({
        siteId: siteId as Id<"sites">,
        title: dialogState.title,
        slug: dialogState.slug,
        parentId: parentId as Id<"pages"> | undefined,
      });
      setDialogState({
        open: false,
        title: "",
        slug: "",
        isSubmitting: false,
        error: "",
      });
      toast.success("Page created");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to create page";
      setDialogState((current) => ({
        ...current,
        error: message,
        isSubmitting: false,
      }));
      toast.error(message);
    }
  };

  return (
    <FormDialog
      open={dialogState.open}
      onOpenChange={handleOpenChange}
      title="Create New Page"
      description="Add a new page to your site"
      trigger={
        <Button variant="ghost" size="icon" className="h-6 w-6">
          <Plus className="h-4 w-4" />
        </Button>
      }
      onSubmit={handleSubmit}
      isSubmitting={dialogState.isSubmitting}
      submitLabel="Create Page"
      submittingLabel="Creating..."
    >
      <div className="space-y-2">
        <Label htmlFor="pageTitle">Page Title</Label>
        <Input
          id="pageTitle"
          placeholder="Getting Started"
          value={dialogState.title}
          onChange={(e) => handleTitleChange(e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="pageSlug">URL Slug</Label>
        <Input
          id="pageSlug"
          placeholder="getting-started"
          value={dialogState.slug}
          onChange={(e) => {
            setDialogState((current) => ({
              ...current,
              slug: e.target.value.toLowerCase(),
              error: "",
            }));
          }}
          required
          pattern={SLUG_PATTERN}
        />
      </div>

      {dialogState.error && (
        <p className="text-sm text-destructive">{dialogState.error}</p>
      )}
    </FormDialog>
  );
}
