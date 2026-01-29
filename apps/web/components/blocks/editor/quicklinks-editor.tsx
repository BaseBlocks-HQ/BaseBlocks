"use client";

import { useEditorContext } from "@/components/editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useEntityAuth } from "@/lib/auth";
import { entityStorageClient } from "@/lib/storage/client";
import type { QuicklinkItem, QuicklinkType, QuicklinksContent } from "@/types";
import {
  AppWindow,
  Check,
  ExternalLink,
  Globe,
  HelpCircle,
  Plus,
  Settings2,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { BlockEditorBaseProps } from "../types";

const MAX_LINKS = 4;

function generateId() {
  return `ql-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Preview card - matches the published site renderer
interface QuicklinkPreviewCardProps {
  link: QuicklinkItem;
  onEdit: () => void;
  onRemove: () => void;
}

function QuicklinkPreviewCard({
  link,
  onEdit,
  onRemove,
}: QuicklinkPreviewCardProps) {
  const isApp = link.linkType === "app";

  return (
    <div className="flex items-start gap-1">
      <a
        href={link.url}
        {...(isApp ? {} : { target: "_blank", rel: "noopener noreferrer" })}
        className="group flex flex-col items-center gap-2 p-4 rounded-xl border bg-card hover:bg-accent hover:border-accent-foreground/20 transition-all duration-200 min-w-[140px]"
      >
        {/* Image or placeholder */}
        <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted flex items-center justify-center flex-shrink-0">
          {link.imageUrl ? (
            <img
              src={link.imageUrl}
              alt={link.title || "Link"}
              className="w-full h-full object-cover"
            />
          ) : isApp ? (
            <AppWindow className="w-5 h-5 text-muted-foreground" />
          ) : (
            <ExternalLink className="w-5 h-5 text-muted-foreground" />
          )}
        </div>

        {/* Title */}
        <span className="text-sm font-medium text-center line-clamp-2 group-hover:text-accent-foreground">
          {link.title || "Untitled"}
        </span>
      </a>

      {/* Edit/Remove buttons */}
      <div className="flex flex-col gap-0.5">
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground hover:text-foreground"
          onClick={onEdit}
        >
          <Settings2 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground hover:text-destructive"
          onClick={onRemove}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// Edit form for a link
interface QuicklinkEditFormProps {
  link: QuicklinkItem;
  onChange: (link: QuicklinkItem) => void;
  onSave: () => void;
  onCancel: () => void;
  onImageUpload: (file: File) => Promise<void>;
  isUploading: boolean;
  isNew: boolean;
}

function QuicklinkEditForm({
  link,
  onChange,
  onSave,
  onCancel,
  onImageUpload,
  isUploading,
  isNew,
}: QuicklinkEditFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const linkType = link.linkType || "website";

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
      await onImageUpload(file);
    }
    e.target.value = "";
  };

  const handleLinkTypeChange = (value: string) => {
    if (value === "website" || value === "app") {
      onChange({ ...link, linkType: value as QuicklinkType });
    }
  };

  const canSave = link.title.trim() && link.url.trim();

  return (
    <div className="p-4 border rounded-lg bg-card space-y-3">
      <div className="flex items-start gap-3">
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
          <p className="text-[10px] text-muted-foreground text-center mt-1">
            Cover
          </p>
        </div>

        {/* Form fields */}
        <div className="flex-1 space-y-2">
          <div>
            <Label className="text-xs text-muted-foreground">Title</Label>
            <Input
              value={link.title}
              onChange={(e) => onChange({ ...link, title: e.target.value })}
              placeholder="Link title"
              className="h-8 text-sm"
            />
          </div>

          {/* Link type toggle */}
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <Label className="text-xs text-muted-foreground">Type</Label>
              {linkType === "app" && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="w-3 h-3 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent
                      side="top"
                      className="max-w-[280px] text-xs"
                    >
                      <p className="font-medium mb-1">
                        How to find app URL schemes:
                      </p>
                      <p>
                        Search online for "[app name] URL scheme" or check the
                        app's documentation. Examples:{" "}
                        <code className="bg-black text-white px-1 rounded">
                          spotify://
                        </code>
                        ,{" "}
                        <code className="bg-black text-white px-1 rounded">
                          slack://
                        </code>
                        ,{" "}
                        <code className="bg-black text-white px-1 rounded">
                          vscode://
                        </code>
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            <ToggleGroup
              type="single"
              value={linkType}
              onValueChange={handleLinkTypeChange}
              variant="outline"
              size="sm"
              className="justify-start"
            >
              <ToggleGroupItem
                value="website"
                aria-label="Website link"
                className="gap-1.5 text-xs px-2.5"
              >
                <Globe className="w-3.5 h-3.5" />
                Website
              </ToggleGroupItem>
              <ToggleGroupItem
                value="app"
                aria-label="Desktop app"
                className="gap-1.5 text-xs px-2.5"
              >
                <AppWindow className="w-3.5 h-3.5" />
                Desktop App
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">
              {linkType === "website" ? "URL" : "App URL Scheme"}
            </Label>
            <Input
              value={link.url}
              onChange={(e) => onChange({ ...link, url: e.target.value })}
              placeholder={
                linkType === "website"
                  ? "https://example.com"
                  : "appname://open"
              }
              className="h-8 text-sm"
            />
            {linkType === "app" && (
              <p className="text-[10px] text-muted-foreground mt-1">
                The app must be installed on the user's device to open
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex justify-end gap-2 pt-2 border-t">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          <X className="w-4 h-4 mr-1" />
          Cancel
        </Button>
        <Button size="sm" onClick={onSave} disabled={!canSave}>
          <Check className="w-4 h-4 mr-1" />
          {isNew ? "Add" : "Save"}
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

  // Saved links from the database
  const [savedLinks, setSavedLinks] = useState<QuicklinkItem[]>(
    content.links || [],
  );
  // IDs of links currently being edited
  const [editingIds, setEditingIds] = useState<Set<string>>(new Set());
  // Local edits for links being edited (unsaved changes)
  const [editingData, setEditingData] = useState<Map<string, QuicklinkItem>>(
    new Map(),
  );
  // Track which link is uploading an image
  const [uploadingLinkId, setUploadingLinkId] = useState<string | null>(null);
  // Track if we're adding a new link
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newLinkData, setNewLinkData] = useState<QuicklinkItem | null>(null);

  // Sync with database when block changes
  useEffect(() => {
    setSavedLinks(content.links || []);
    setEditingIds(new Set());
    setEditingData(new Map());
    setIsAddingNew(false);
    setNewLinkData(null);
  }, [block._id]);

  // Also sync when content changes externally
  useEffect(() => {
    setSavedLinks(content.links || []);
  }, [content.links]);

  const persistLinks = useCallback(
    async (links: QuicklinkItem[]) => {
      onSaveStatusChange?.("saving");
      try {
        await onUpdate({ links });
        onSaveStatusChange?.("saved");
        return true;
      } catch (error) {
        console.error("Failed to save:", error);
        onSaveStatusChange?.("idle");
        toast.error("Failed to save");
        return false;
      }
    },
    [onUpdate, onSaveStatusChange],
  );

  const handleAddClick = () => {
    if (savedLinks.length >= MAX_LINKS) {
      toast.error(`Maximum ${MAX_LINKS} links allowed`);
      return;
    }
    setNewLinkData({
      id: generateId(),
      title: "",
      url: "",
      linkType: "website",
    });
    setIsAddingNew(true);
  };

  const handleSaveNew = async () => {
    if (!newLinkData) return;

    const newLinks = [...savedLinks, newLinkData];
    const success = await persistLinks(newLinks);
    if (success) {
      setSavedLinks(newLinks);
      setIsAddingNew(false);
      setNewLinkData(null);
      toast.success("Link added");
    }
  };

  const handleCancelNew = () => {
    setIsAddingNew(false);
    setNewLinkData(null);
  };

  const handleStartEdit = (linkId: string) => {
    const link = savedLinks.find((l) => l.id === linkId);
    if (link) {
      setEditingIds((prev) => new Set(prev).add(linkId));
      setEditingData((prev) => new Map(prev).set(linkId, { ...link }));
    }
  };

  const handleSaveEdit = async (linkId: string) => {
    const editedLink = editingData.get(linkId);
    if (!editedLink) return;

    const newLinks = savedLinks.map((l) => (l.id === linkId ? editedLink : l));
    const success = await persistLinks(newLinks);
    if (success) {
      setSavedLinks(newLinks);
      setEditingIds((prev) => {
        const next = new Set(prev);
        next.delete(linkId);
        return next;
      });
      setEditingData((prev) => {
        const next = new Map(prev);
        next.delete(linkId);
        return next;
      });
      toast.success("Link updated");
    }
  };

  const handleCancelEdit = (linkId: string) => {
    setEditingIds((prev) => {
      const next = new Set(prev);
      next.delete(linkId);
      return next;
    });
    setEditingData((prev) => {
      const next = new Map(prev);
      next.delete(linkId);
      return next;
    });
  };

  const handleRemove = async (linkId: string) => {
    const newLinks = savedLinks.filter((l) => l.id !== linkId);
    const success = await persistLinks(newLinks);
    if (success) {
      setSavedLinks(newLinks);
      // Also clean up any editing state
      setEditingIds((prev) => {
        const next = new Set(prev);
        next.delete(linkId);
        return next;
      });
      setEditingData((prev) => {
        const next = new Map(prev);
        next.delete(linkId);
        return next;
      });
      toast.success("Link removed");
    }
  };

  const handleImageUpload = async (
    file: File,
    linkId: string,
    isNew: boolean,
  ) => {
    setUploadingLinkId(linkId);

    try {
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");
      if (!user?.id) throw new Error("User not found");

      const timestamp = Date.now();
      const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
      const path = entityStorageClient.generatePath(
        siteId,
        user.id,
        `quicklink_${timestamp}_${sanitizedFilename}`,
      );

      const { cdnUrl } = await entityStorageClient.upload(file, path, token);

      if (isNew && newLinkData) {
        setNewLinkData({ ...newLinkData, imageUrl: cdnUrl });
      } else {
        const currentData = editingData.get(linkId);
        if (currentData) {
          setEditingData((prev) =>
            new Map(prev).set(linkId, { ...currentData, imageUrl: cdnUrl }),
          );
        }
      }
      toast.success("Image uploaded");
    } catch (error) {
      console.error("Failed to upload image:", error);
      toast.error("Failed to upload image");
    } finally {
      setUploadingLinkId(null);
    }
  };

  const handleEditChange = (linkId: string, updatedLink: QuicklinkItem) => {
    setEditingData((prev) => new Map(prev).set(linkId, updatedLink));
  };

  return (
    <div className="relative">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-muted-foreground">
            Quick Links ({savedLinks.length}/{MAX_LINKS})
          </h3>
          <Button
            variant="outline"
            size="sm"
            onClick={handleAddClick}
            disabled={savedLinks.length >= MAX_LINKS || isAddingNew}
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Link
          </Button>
        </div>

        {/* New link form */}
        {isAddingNew && newLinkData && (
          <QuicklinkEditForm
            link={newLinkData}
            onChange={setNewLinkData}
            onSave={handleSaveNew}
            onCancel={handleCancelNew}
            onImageUpload={(file) =>
              handleImageUpload(file, newLinkData.id, true)
            }
            isUploading={uploadingLinkId === newLinkData.id}
            isNew={true}
          />
        )}

        {/* Links preview grid / edit forms */}
        {savedLinks.length > 0 ? (
          <div className="space-y-3">
            {/* Preview cards for non-editing links */}
            {savedLinks.some((l) => !editingIds.has(l.id)) && (
              <div className="flex flex-wrap gap-3">
                {savedLinks
                  .filter((l) => !editingIds.has(l.id))
                  .map((link) => (
                    <QuicklinkPreviewCard
                      key={link.id}
                      link={link}
                      onEdit={() => handleStartEdit(link.id)}
                      onRemove={() => handleRemove(link.id)}
                    />
                  ))}
              </div>
            )}

            {/* Edit forms for links being edited */}
            {savedLinks
              .filter((l) => editingIds.has(l.id))
              .map((link) => {
                const editData = editingData.get(link.id) || link;
                return (
                  <QuicklinkEditForm
                    key={link.id}
                    link={editData}
                    onChange={(updated) => handleEditChange(link.id, updated)}
                    onSave={() => handleSaveEdit(link.id)}
                    onCancel={() => handleCancelEdit(link.id)}
                    onImageUpload={(file) =>
                      handleImageUpload(file, link.id, false)
                    }
                    isUploading={uploadingLinkId === link.id}
                    isNew={false}
                  />
                );
              })}
          </div>
        ) : !isAddingNew ? (
          <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
            <ExternalLink className="w-8 h-8 mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">No quick links yet</p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Click "Add Link" to create your first quick link
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
