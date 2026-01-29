"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@repo/backend";
import { useMutation } from "convex/react";
import { useEffect, useState } from "react";
import { FormDialog } from "./form-dialog";

interface EditSiteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  site: {
    _id: string;
    name: string;
    description?: string;
  };
}

export function EditSiteDialog({
  open,
  onOpenChange,
  site,
}: EditSiteDialogProps) {
  const [name, setName] = useState(site.name);
  const [description, setDescription] = useState(site.description || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const updateSite = useMutation(api.sites.mutations.update);

  // Reset form when dialog opens with new site data
  useEffect(() => {
    if (open) {
      setName(site.name);
      setDescription(site.description || "");
      setError("");
    }
  }, [open, site.name, site.description]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      await updateSite({
        siteId: site._id as any,
        name,
        description: description || undefined,
      });
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update site");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Edit Site"
      description="Update your site's name and description"
      onSubmit={handleSubmit}
      isSubmitting={isSubmitting}
      submitLabel="Save Changes"
      submittingLabel="Saving..."
    >
      <div className="space-y-2">
        <Label htmlFor="editSiteName">Site Name</Label>
        <Input
          id="editSiteName"
          placeholder="Engineering Docs"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="editSiteDescription">Description (optional)</Label>
        <Textarea
          id="editSiteDescription"
          placeholder="Internal documentation for the engineering team"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </FormDialog>
  );
}
