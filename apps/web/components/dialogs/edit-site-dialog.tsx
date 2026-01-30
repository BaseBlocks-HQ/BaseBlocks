"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useEntityAuth } from "@/lib/auth";
import { entityStorageClient } from "@/lib/storage/client";
import { api } from "@repo/backend";
import { useMutation } from "convex/react";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { FormDialog } from "./form-dialog";

interface EditSiteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  site: {
    _id: string;
    name: string;
    description?: string;
    logoUrl?: string;
  };
}

export function EditSiteDialog({
  open,
  onOpenChange,
  site,
}: EditSiteDialogProps) {
  const [name, setName] = useState(site.name);
  const [description, setDescription] = useState(site.description || "");
  const [logoUrl, setLogoUrl] = useState(site.logoUrl || "");
  const [logoPreview, setLogoPreview] = useState(site.logoUrl || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [error, setError] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { getToken, user } = useEntityAuth();
  const updateSite = useMutation(api.sites.mutations.update);

  // Reset form when dialog opens with new site data
  useEffect(() => {
    if (open) {
      setName(site.name);
      setDescription(site.description || "");
      setLogoUrl(site.logoUrl || "");
      setLogoPreview(site.logoUrl || "");
      setError("");
    }
  }, [open, site.name, site.description, site.logoUrl]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file");
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setError("Logo must be less than 2MB");
      return;
    }

    setError("");
    setIsUploadingLogo(true);

    try {
      const token = await getToken();
      if (!token) {
        throw new Error("Not authenticated");
      }

      if (!user?.id) {
        throw new Error("User not found");
      }

      // Generate a path for the logo
      const timestamp = Date.now();
      const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
      const path = `/${process.env.NEXT_PUBLIC_ENTITY_AUTH_WORKSPACE_TENANT_ID || "baseblocks-232733"}/logos/${site._id}/${timestamp}_${sanitizedFilename}`;

      // Upload to Entity Storage
      const { cdnUrl } = await entityStorageClient.upload(file, path, token);

      setLogoUrl(cdnUrl);
      setLogoPreview(cdnUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload logo");
    } finally {
      setIsUploadingLogo(false);
      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveLogo = () => {
    setLogoUrl("");
    setLogoPreview("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      await updateSite({
        siteId: site._id as any,
        name,
        description: description || undefined,
        logoUrl: logoUrl || undefined,
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
      description="Update your site's name, description, and logo"
      onSubmit={handleSubmit}
      isSubmitting={isSubmitting}
      submitLabel="Save Changes"
      submittingLabel="Saving..."
    >
      <div className="space-y-2">
        <Label>Site Logo</Label>
        <div className="flex items-center gap-4">
          {logoPreview ? (
            <div className="relative">
              <img
                src={logoPreview}
                alt="Site logo"
                className="h-16 w-16 rounded-lg object-contain border bg-muted"
              />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute -top-2 -right-2 h-6 w-6"
                onClick={handleRemoveLogo}
                disabled={isUploadingLogo}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-dashed bg-muted text-muted-foreground">
              <ImagePlus className="h-6 w-6" />
            </div>
          )}
          <div className="flex-1">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleLogoUpload}
              className="hidden"
              disabled={isUploadingLogo}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingLogo}
            >
              {isUploadingLogo ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                "Upload Logo"
              )}
            </Button>
            <p className="mt-1 text-xs text-muted-foreground">
              Recommended: 128x128px, max 2MB
            </p>
          </div>
        </div>
      </div>

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
