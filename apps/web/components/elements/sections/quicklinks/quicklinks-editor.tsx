"use client";

import { useEditorContext } from "@/components/editor";
import type { ElementEditorProps } from "@/components/elements/registry";
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
import { cn } from "@/lib/utils";
import type { QuicklinkItem, QuicklinkType } from "@/types/elements";
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

const MAX_LINKS = 4;

function generateId() {
  return `ql-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Preview card for a quicklink
interface QuicklinkCardProps {
  link: QuicklinkItem;
  isEditing: boolean;
  onStartEdit: () => void;
  onRemove: () => void;
}

function QuicklinkCard({
  link,
  isEditing,
  onStartEdit,
  onRemove,
}: QuicklinkCardProps) {
  const isApp = link.linkType === "app";

  return (
    <div className="group/card relative">
      {/* Controls above card */}
      <div
        className={cn(
          "absolute -top-6 right-0 flex gap-0.5",
          "opacity-0 group-hover/card:opacity-100 transition-opacity",
          isEditing && "opacity-100",
        )}
      >
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 text-muted-foreground hover:text-foreground bg-background/80 backdrop-blur-sm"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onStartEdit();
          }}
        >
          <Settings2 className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 text-muted-foreground hover:text-destructive bg-background/80 backdrop-blur-sm"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onRemove();
          }}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>

      {/* Card */}
      <a
        href={link.url || "#"}
        {...(isApp ? {} : { target: "_blank", rel: "noopener noreferrer" })}
        onClick={(e) => e.preventDefault()}
        className={cn(
          "flex flex-col items-center gap-1.5 p-3",
          "rounded-lg border bg-card",
          "hover:bg-accent hover:border-accent-foreground/20",
          "transition-all duration-200",
          "w-full",
        )}
      >
        <div className="w-10 h-10 rounded-lg overflow-hidden bg-muted flex items-center justify-center flex-shrink-0">
          {link.imageUrl ? (
            <img
              src={link.imageUrl}
              alt={link.title || "Link"}
              className="w-full h-full object-cover"
            />
          ) : isApp ? (
            <AppWindow className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ExternalLink className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
        <span className="text-xs font-medium text-center line-clamp-2 w-full">
          {link.title || "Untitled"}
        </span>
      </a>
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
    <div className="p-3 border rounded-lg bg-card space-y-3">
      {/* Image upload + Title */}
      <div className="flex items-start gap-3">
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
            className="w-12 h-12 rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center overflow-hidden hover:border-primary/50 transition-colors disabled:opacity-50"
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
              <Upload className="w-4 h-4 text-muted-foreground" />
            )}
          </button>
        </div>
        <div className="flex-1 min-w-0 space-y-2">
          <div>
            <Label className="text-xs text-muted-foreground">Title</Label>
            <Input
              value={link.title}
              onChange={(e) => onChange({ ...link, title: e.target.value })}
              placeholder="Link title"
              className="h-8 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Link type toggle */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5">
          <Label className="text-xs text-muted-foreground">Type</Label>
          {linkType === "app" && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="w-3 h-3 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[200px] text-xs">
                  <p className="font-medium mb-1">App URL schemes:</p>
                  <p>
                    Examples:{" "}
                    <code className="bg-black text-white px-1 rounded">
                      spotify://
                    </code>
                    ,{" "}
                    <code className="bg-black text-white px-1 rounded">
                      slack://
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
            className="gap-1 text-xs px-2"
          >
            <Globe className="w-3 h-3" />
            Web
          </ToggleGroupItem>
          <ToggleGroupItem
            value="app"
            aria-label="Desktop app"
            className="gap-1 text-xs px-2"
          >
            <AppWindow className="w-3 h-3" />
            App
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* URL field */}
      <div>
        <Label className="text-xs text-muted-foreground">
          {linkType === "website" ? "URL" : "App URL"}
        </Label>
        <Input
          value={link.url}
          onChange={(e) => onChange({ ...link, url: e.target.value })}
          placeholder={
            linkType === "website" ? "https://example.com" : "appname://open"
          }
          className="h-8 text-sm"
        />
        {linkType === "app" && (
          <p className="text-[10px] text-muted-foreground mt-1">
            App must be installed to open
          </p>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex justify-end gap-2 pt-2 border-t">
        <Button
          variant="ghost"
          size="sm"
          onClick={onCancel}
          className="h-7 px-2 text-xs"
        >
          <X className="w-3 h-3 mr-1" />
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={onSave}
          disabled={!canSave}
          className="h-7 px-2 text-xs"
        >
          <Check className="w-3 h-3 mr-1" />
          {isNew ? "Add" : "Save"}
        </Button>
      </div>
    </div>
  );
}

export function QuicklinksEditor({
  id,
  content,
  onUpdate,
  onSaveStatusChange,
}: ElementEditorProps<"quicklinks">) {
  const { siteId } = useEditorContext();
  const { getToken, user } = useEntityAuth();

  const [savedLinks, setSavedLinks] = useState<QuicklinkItem[]>(
    content.links || [],
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingData, setEditingData] = useState<QuicklinkItem | null>(null);
  const [uploadingLinkId, setUploadingLinkId] = useState<string | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newLinkData, setNewLinkData] = useState<QuicklinkItem | null>(null);

  // Sync with database
  useEffect(() => {
    setSavedLinks(content.links || []);
    setEditingId(null);
    setEditingData(null);
    setIsAddingNew(false);
    setNewLinkData(null);
  }, [id]);

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
      setEditingId(linkId);
      setEditingData({ ...link });
    }
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editingData) return;
    const newLinks = savedLinks.map((l) =>
      l.id === editingId ? editingData : l,
    );
    const success = await persistLinks(newLinks);
    if (success) {
      setSavedLinks(newLinks);
      setEditingId(null);
      setEditingData(null);
      toast.success("Link updated");
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingData(null);
  };

  const handleRemove = async (linkId: string) => {
    const newLinks = savedLinks.filter((l) => l.id !== linkId);
    const success = await persistLinks(newLinks);
    if (success) {
      setSavedLinks(newLinks);
      if (editingId === linkId) {
        setEditingId(null);
        setEditingData(null);
      }
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
      } else if (editingData) {
        setEditingData({ ...editingData, imageUrl: cdnUrl });
      }
      toast.success("Image uploaded");
    } catch (error) {
      console.error("Failed to upload image:", error);
      toast.error("Failed to upload image");
    } finally {
      setUploadingLinkId(null);
    }
  };

  // Count cards that aren't being edited
  const visibleCards = savedLinks.filter((l) => l.id !== editingId);

  return (
    <div className="w-full space-y-4">
      {/* Header with add button */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">
          Links ({savedLinks.length}/{MAX_LINKS})
        </span>
        <Button
          variant="outline"
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={handleAddClick}
          disabled={savedLinks.length >= MAX_LINKS || isAddingNew}
        >
          <Plus className="w-3 h-3 mr-1" />
          Add
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

      {/* Edit form for existing link */}
      {editingId && editingData && (
        <QuicklinkEditForm
          link={editingData}
          onChange={setEditingData}
          onSave={handleSaveEdit}
          onCancel={handleCancelEdit}
          onImageUpload={(file) => handleImageUpload(file, editingId, false)}
          isUploading={uploadingLinkId === editingId}
          isNew={false}
        />
      )}

      {/* Cards grid - responsive */}
      {visibleCards.length > 0 ? (
        <div
          className={cn(
            "grid gap-3 pt-3",
            visibleCards.length === 1 && "grid-cols-1",
            visibleCards.length === 2 && "grid-cols-2",
            visibleCards.length >= 3 &&
              "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4",
          )}
        >
          {visibleCards.map((link) => (
            <QuicklinkCard
              key={link.id}
              link={link}
              isEditing={false}
              onStartEdit={() => handleStartEdit(link.id)}
              onRemove={() => handleRemove(link.id)}
            />
          ))}
        </div>
      ) : !isAddingNew && !editingId ? (
        <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center transition-colors hover:border-muted-foreground/50 hover:bg-muted/30">
          <ExternalLink className="w-6 h-6 mx-auto text-muted-foreground/50 mb-2" />
          <p className="text-sm text-muted-foreground">No quick links yet</p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            Click "Add" to create your first link
          </p>
        </div>
      ) : null}
    </div>
  );
}
