"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import { useDebounceCallback } from "@/hooks";
import { Plus, Trash2, Upload, ExternalLink, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useEditorContext } from "@/components/editor";
import { useEntityAuth } from "@/lib/auth";
import { entityStorageClient } from "@/lib/storage/client";
import type { BlockEditorBaseProps } from "../types";
import type { QuicklinksContent, QuicklinkItem } from "@/types";

const MAX_LINKS = 4;

function generateId() {
  return `ql-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

interface QuicklinkEditorItemProps {
  link: QuicklinkItem;
  onUpdate: (link: QuicklinkItem) => void;
  onRemove: () => void;
  onImageUpload: (file: File, linkId: string) => Promise<void>;
  isUploading: boolean;
}

function QuicklinkEditorItem({
  link,
  onUpdate,
  onRemove,
  onImageUpload,
  isUploading,
}: QuicklinkEditorItemProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast.error("Please select an image file");
        return;
      }
      await onImageUpload(file, link.id);
    }
    // Reset input so same file can be selected again
    e.target.value = "";
  };

  return (
    <div className="flex gap-3 p-3 border rounded-lg bg-card">
      {/* Image upload area */}
      <div className="flex-shrink-0">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
        <button
          type="button"
          onClick={handleImageClick}
          disabled={isUploading}
          className="w-16 h-16 rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center overflow-hidden hover:border-primary/50 transition-colors disabled:opacity-50"
        >
          {link.imageUrl ? (
            <img
              src={link.imageUrl}
              alt={link.title || "Link cover"}
              className="w-full h-full object-cover"
            />
          ) : isUploading ? (
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          ) : (
            <Upload className="w-5 h-5 text-muted-foreground" />
          )}
        </button>
      </div>

      {/* Link details */}
      <div className="flex-1 space-y-2">
        <div>
          <Label className="text-xs text-muted-foreground">Title</Label>
          <Input
            value={link.title}
            onChange={(e) => onUpdate({ ...link, title: e.target.value })}
            placeholder="Link title"
            className="h-8 text-sm"
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">URL</Label>
          <Input
            value={link.url}
            onChange={(e) => onUpdate({ ...link, url: e.target.value })}
            placeholder="https://example.com"
            className="h-8 text-sm"
          />
        </div>
      </div>

      {/* Remove button */}
      <div className="flex-shrink-0 flex items-start">
        <Button
          variant="ghost"
          size="icon"
          onClick={onRemove}
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

export function QuicklinksEditor({
  block,
  onUpdate,
  onSaveStatusChange,
}: BlockEditorBaseProps) {
  const content = block.content as QuicklinksContent;
  const { siteId } = useEditorContext();
  const { getToken, user } = useEntityAuth();

  const [localLinks, setLocalLinks] = useState<QuicklinkItem[]>(content.links || []);
  const [uploadingLinkId, setUploadingLinkId] = useState<string | null>(null);

  const debouncedSave = useDebounceCallback(
    useCallback(
      async (links: QuicklinkItem[]) => {
        onSaveStatusChange?.("saving");
        try {
          await onUpdate({ links });
          onSaveStatusChange?.("saved");
        } catch (error) {
          console.error("Failed to save:", error);
          onSaveStatusChange?.("idle");
        }
      },
      [onUpdate, onSaveStatusChange],
    ),
    500,
  );

  // Sync local state when block changes (e.g., switching blocks)
  useEffect(() => {
    setLocalLinks(content.links || []);
  }, [block._id]);

  const triggerSave = useCallback(
    (links: QuicklinkItem[]) => {
      setLocalLinks(links);
      onSaveStatusChange?.("pending");
      debouncedSave(links);
    },
    [debouncedSave, onSaveStatusChange],
  );

  const handleAddLink = () => {
    if (localLinks.length >= MAX_LINKS) {
      toast.error(`Maximum ${MAX_LINKS} links allowed`);
      return;
    }
    const newLink: QuicklinkItem = {
      id: generateId(),
      title: "",
      url: "",
    };
    triggerSave([...localLinks, newLink]);
  };

  const handleUpdateLink = (index: number, updatedLink: QuicklinkItem) => {
    const newLinks = [...localLinks];
    newLinks[index] = updatedLink;
    triggerSave(newLinks);
  };

  const handleRemoveLink = (index: number) => {
    const newLinks = localLinks.filter((_, i) => i !== index);
    triggerSave(newLinks);
  };

  const handleImageUpload = async (file: File, linkId: string) => {
    setUploadingLinkId(linkId);

    try {
      const token = await getToken();
      if (!token) {
        throw new Error("Not authenticated");
      }

      if (!user?.id) {
        throw new Error("User not found");
      }

      // Generate storage path for the image
      const timestamp = Date.now();
      const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
      const path = entityStorageClient.generatePath(
        siteId,
        user.id,
        `quicklink_${timestamp}_${sanitizedFilename}`,
      );

      // Upload to Entity Storage
      const { cdnUrl } = await entityStorageClient.upload(file, path, token);

      // Update the link with the image URL
      const linkIndex = localLinks.findIndex((l) => l.id === linkId);
      if (linkIndex !== -1) {
        const existingLink = localLinks[linkIndex];
        if (existingLink) {
          const updatedLink: QuicklinkItem = {
            id: existingLink.id,
            title: existingLink.title,
            url: existingLink.url,
            imageUrl: cdnUrl,
          };
          handleUpdateLink(linkIndex, updatedLink);
          toast.success("Image uploaded");
        }
      }
    } catch (error) {
      console.error("Failed to upload image:", error);
      toast.error("Failed to upload image");
    } finally {
      setUploadingLinkId(null);
    }
  };

  return (
    <div className="relative">
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-muted-foreground">
            Quick Links ({localLinks.length}/{MAX_LINKS})
          </h3>
          <Button
            variant="outline"
            size="sm"
            onClick={handleAddLink}
            disabled={localLinks.length >= MAX_LINKS}
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Link
          </Button>
        </div>

        {/* Links list */}
        {localLinks.length > 0 ? (
          <div className="space-y-2">
            {localLinks.map((link, index) => (
              <QuicklinkEditorItem
                key={link.id}
                link={link}
                onUpdate={(updatedLink) => handleUpdateLink(index, updatedLink)}
                onRemove={() => handleRemoveLink(index)}
                onImageUpload={handleImageUpload}
                isUploading={uploadingLinkId === link.id}
              />
            ))}
          </div>
        ) : (
          <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
            <ExternalLink className="w-8 h-8 mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">No quick links yet</p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Click "Add Link" to create your first quick link
            </p>
          </div>
        )}

        {/* Preview hint */}
        {localLinks.length > 0 && (
          <p className="text-xs text-muted-foreground text-center">
            Links will appear as clickable buttons that open in a new tab
          </p>
        )}
      </div>
    </div>
  );
}
