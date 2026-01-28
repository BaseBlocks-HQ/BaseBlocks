"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "@repo/backend";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { generateSlug, SLUG_PATTERN } from "@/lib/validation";
import { FormDialog } from "./form-dialog";

export function CreateSiteDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const createSite = useMutation(api.sites.mutations.create);

  const handleNameChange = (value: string) => {
    setName(value);
    setSlug(generateSlug(value));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      await createSite({
        name,
        slug,
        description: description || undefined,
      });
      setOpen(false);
      setName("");
      setSlug("");
      setDescription("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create site");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={setOpen}
      title="Create New Site"
      description="Create a new site for your documentation or resources"
      trigger={
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create Site
        </Button>
      }
      onSubmit={handleSubmit}
      isSubmitting={isSubmitting}
      submitLabel="Create Site"
      submittingLabel="Creating..."
    >
      <div className="space-y-2">
        <Label htmlFor="siteName">Site Name</Label>
        <Input
          id="siteName"
          placeholder="Engineering Docs"
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="siteSlug">URL Slug</Label>
        <Input
          id="siteSlug"
          placeholder="engineering-docs"
          value={slug}
          onChange={(e) => setSlug(e.target.value.toLowerCase())}
          required
          pattern={SLUG_PATTERN}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="siteDescription">Description (optional)</Label>
        <Textarea
          id="siteDescription"
          placeholder="Internal documentation for the engineering team"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </FormDialog>
  );
}
