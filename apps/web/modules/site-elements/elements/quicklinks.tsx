"use client";

import { filesClient } from "@/app/_storage/client";
import { cn } from "@baseblocks/ui/lib/utils";
import { useSectionContext } from "@/modules/site-runtime/section";
import type { ElementEditorProps } from "@/modules/site-elements/registry";
import { useEditorSite } from "@/modules/editor/editor-state";
import { api } from "@baseblocks/backend";
import type { QuicklinkItem, QuicklinkType } from "@baseblocks/domain/elements";
import { Button } from "@baseblocks/ui/button";
import { Input } from "@baseblocks/ui/input";
import { Label } from "@baseblocks/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@baseblocks/ui/toggle-group";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@baseblocks/ui/tooltip";
import { useMutation } from "convex/react";
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
import Image from "next/image";
import { useReducer, useRef, useState } from "react";
import { toast } from "sonner";
import type { ElementRendererProps } from "@/modules/site-elements/registry";

function generateId() {
  return `ql-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function isWebUrl(url: string): boolean {
  if (url.startsWith("/")) return true;
  try {
    const { protocol } = new URL(url);
    return protocol === "https:" || protocol === "http:";
  } catch {
    return false;
  }
}

function AddQuicklinkCard({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group w-full flex flex-col items-center gap-2 p-4 rounded-xl border border-dashed bg-card hover:bg-primary/5 hover:border-primary/30 transition-all duration-200"
    >
      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
        <Plus className="w-5 h-5 text-primary/70 group-hover:text-primary transition-colors" />
      </div>
      <span className="text-sm font-medium text-center text-muted-foreground group-hover:text-primary transition-colors">
        Add link
      </span>
    </button>
  );
}

function QuicklinkCard({
  link,
  onStartEdit,
  onRemove,
}: {
  link: QuicklinkItem;
  onStartEdit: () => void;
  onRemove: () => void;
}) {
  const isApp = link.linkType === "app";

  return (
    <div className="group/card relative">
      {/* Controls — overlaid on top-right of card, outside button to avoid nested interactives */}
      <div className="absolute top-1 right-1 flex gap-0.5 z-10 opacity-0 group-hover/card:opacity-100 transition-opacity">
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

      <button
        type="button"
        onClick={(e) => e.stopPropagation()}
        className="group w-full flex flex-col items-center gap-2 p-4 rounded-xl border bg-card hover:bg-primary/5 hover:border-primary/30 transition-all duration-200"
      >
        <div className="w-12 h-12 rounded-lg overflow-hidden bg-primary/10 flex items-center justify-center flex-shrink-0">
          {link.imageUrl ? (
            <Image
              src={link.imageUrl}
              alt={link.title || "Link"}
              className="w-full h-full object-cover"
              width={48}
              height={48}
              unoptimized
            />
          ) : isApp ? (
            <AppWindow className="w-5 h-5 text-primary/70" />
          ) : (
            <ExternalLink className="w-5 h-5 text-primary/70" />
          )}
        </div>
        <span className="text-sm font-medium text-center line-clamp-2 group-hover:text-primary">
          {link.title || "Untitled"}
        </span>
      </button>
    </div>
  );
}

function QuicklinkEditForm({
  link,
  onChange,
  onSave,
  onCancel,
  onImageUpload,
  isUploading,
  isNew,
}: {
  link: QuicklinkItem;
  onChange: (link: QuicklinkItem) => void;
  onSave: () => void;
  onCancel: () => void;
  onImageUpload: (file: File) => Promise<void>;
  isUploading: boolean;
  isNew: boolean;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const linkType = link.linkType || "website";

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

  const urlValue = link.url.trim();
  const isUrlValid =
    linkType === "app" ? urlValue.length > 0 : isWebUrl(urlValue);
  const showUrlError = urlValue.length > 0 && !isUrlValid;
  const canSave = link.title.trim() && urlValue && isUrlValid;

  return (
    <div className="p-3 border rounded-lg bg-card space-y-3">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 relative">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="w-12 h-12 rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center overflow-hidden hover:border-primary/50 transition-colors disabled:opacity-50"
          >
            {link.imageUrl ? (
              <Image
                src={link.imageUrl}
                alt={link.title || "Link cover"}
                className="w-full h-full object-cover"
                width={48}
                height={48}
                unoptimized
              />
            ) : isUploading ? (
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            ) : (
              <Upload className="w-4 h-4 text-muted-foreground" />
            )}
          </button>
          {link.imageUrl && (
            <button
              type="button"
              onClick={() => onChange({ ...link, imageUrl: undefined })}
              className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center hover:bg-destructive/80 transition-colors"
            >
              <X className="w-2.5 h-2.5" />
            </button>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <Label className="text-xs text-muted-foreground">Title</Label>
          <Input
            value={link.title}
            onChange={(e) => onChange({ ...link, title: e.target.value })}
            placeholder="Link title"
            className="h-8 text-sm"
          />
        </div>
      </div>

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
          onValueChange={(v) => {
            if (v === "website" || v === "app") {
              onChange({ ...link, linkType: v as QuicklinkType });
            }
          }}
          variant="outline"
          size="sm"
          className="justify-start"
        >
          <ToggleGroupItem value="website" className="gap-1 text-xs px-2">
            <Globe className="w-3 h-3" />
            Web
          </ToggleGroupItem>
          <ToggleGroupItem value="app" className="gap-1 text-xs px-2">
            <AppWindow className="w-3 h-3" />
            App
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

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
          className={cn(
            "h-8 text-sm",
            showUrlError && "border-destructive focus-visible:ring-destructive",
          )}
        />
        {showUrlError ? (
          <p className="text-[10px] text-destructive mt-1">
            Enter a valid URL starting with https://
          </p>
        ) : linkType === "app" ? (
          <p className="text-[10px] text-muted-foreground mt-1">
            App must be installed to open
          </p>
        ) : null}
      </div>

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

interface QuicklinksEditorState {
  draft: QuicklinkItem | null;
  mode: "adding" | "editing" | "idle";
  uploadingLinkId: string | null;
}

type QuicklinksEditorAction =
  | { type: "finishEditing" }
  | { type: "setUploadingLinkId"; value: string | null }
  | { type: "startAdding"; draft: QuicklinkItem }
  | { type: "startEditing"; draft: QuicklinkItem }
  | { type: "updateDraft"; draft: QuicklinkItem };

function createQuicklinksEditorState(): QuicklinksEditorState {
  return {
    draft: null,
    mode: "idle",
    uploadingLinkId: null,
  };
}

function quicklinksEditorReducer(
  state: QuicklinksEditorState,
  action: QuicklinksEditorAction,
): QuicklinksEditorState {
  switch (action.type) {
    case "finishEditing":
      return { ...state, draft: null, mode: "idle", uploadingLinkId: null };
    case "setUploadingLinkId":
      return { ...state, uploadingLinkId: action.value };
    case "startAdding":
      return { ...state, draft: action.draft, mode: "adding" };
    case "startEditing":
      return { ...state, draft: action.draft, mode: "editing" };
    case "updateDraft":
      return { ...state, draft: action.draft };
    default:
      return state;
  }
}

export function QuicklinksEditor({
  content,
  onUpdate,
  onSaveStatusChange,
}: ElementEditorProps<"quicklinks">) {
  const { siteId } = useEditorSite();
  const createSiteAsset = useMutation(api.files.createSiteAsset);
  const sectionContext = useSectionContext();
  const isSidebar = sectionContext?.isAside ?? false;
  const [state, dispatch] = useReducer(
    quicklinksEditorReducer,
    undefined,
    createQuicklinksEditorState,
  );

  const [savedLinks, setSavedLinks] = useState<QuicklinkItem[]>(
    content.links || [],
  );

  const editingData = state.mode === "editing" ? state.draft : null;
  const editingId = state.mode === "editing" ? (state.draft?.id ?? null) : null;
  const isAddingNew = state.mode === "adding";
  const newLinkData = state.mode === "adding" ? state.draft : null;

  const persistLinks = async (links: QuicklinkItem[]) => {
    onSaveStatusChange?.("saving");
    return Promise.resolve(onUpdate({ links }))
      .then(() => {
        onSaveStatusChange?.("saved");
        return true;
      })
      .catch(() => {
        onSaveStatusChange?.("idle");
        toast.error("Failed to save");
        return false;
      });
  };

  const applyUploadedImageUrl = (url: string) => {
    if (!state.draft) {
      return;
    }

    dispatch({
      type: "updateDraft",
      draft: { ...state.draft, imageUrl: url },
    });
  };

  const handleImageUpload = async (file: File, linkId: string) => {
    dispatch({ type: "setUploadingLinkId", value: linkId });
    let objectKey: string | null = null;

    const uploadedUrl = await filesClient
      .upload(file, {
        siteId,
        purpose: "siteAsset",
      })
      .then(async (uploadResult) => {
        objectKey = uploadResult.objectKey;
        const { url } = await createSiteAsset({
          siteId: siteId as never,
          objectKey: uploadResult.objectKey,
          filename: file.name,
          contentType: uploadResult.contentType,
          size: uploadResult.size,
          checksum: uploadResult.checksum,
        });
        return url;
      })
      .catch(async () => {
        if (objectKey) {
          await filesClient.cleanup({
            siteId,
            purpose: "siteAsset",
            objectKey,
          });
        }
        return null;
      });

    if (uploadedUrl) {
      applyUploadedImageUrl(uploadedUrl);
      toast.success("Image uploaded");
    } else {
      toast.error("Failed to upload image");
    }

    dispatch({ type: "setUploadingLinkId", value: null });
  };

  const visibleCards = savedLinks.filter((l) => l.id !== editingId);

  return (
    <div className="w-full space-y-4">
      {isAddingNew && newLinkData && (
        <QuicklinkEditForm
          link={newLinkData}
          onChange={(draft) => dispatch({ type: "updateDraft", draft })}
          onSave={async () => {
            if (!newLinkData) return;
            const success = await persistLinks([...savedLinks, newLinkData]);
            if (success) {
              setSavedLinks([...savedLinks, newLinkData]);
              dispatch({ type: "finishEditing" });
              toast.success("Link added");
            }
          }}
          onCancel={() => dispatch({ type: "finishEditing" })}
          onImageUpload={(file) => handleImageUpload(file, newLinkData.id)}
          isUploading={state.uploadingLinkId === newLinkData.id}
          isNew={true}
        />
      )}

      {editingId && editingData && (
        <QuicklinkEditForm
          link={editingData}
          onChange={(draft) => dispatch({ type: "updateDraft", draft })}
          onSave={async () => {
            if (!editingId || !editingData) return;
            const newLinks = savedLinks.map((l) =>
              l.id === editingId ? editingData : l,
            );
            const success = await persistLinks(newLinks);
            if (success) {
              setSavedLinks(newLinks);
              dispatch({ type: "finishEditing" });
              toast.success("Link updated");
            }
          }}
          onCancel={() => dispatch({ type: "finishEditing" })}
          onImageUpload={(file) => handleImageUpload(file, editingId)}
          isUploading={state.uploadingLinkId === editingId}
          isNew={false}
        />
      )}

      <div
        className={cn(
          isSidebar
            ? "flex flex-col gap-3"
            : "flex flex-wrap justify-center gap-3",
        )}
      >
        {!isAddingNew && (
          <div className={isSidebar ? "w-full" : "w-[calc(20%-10px)]"}>
            <AddQuicklinkCard
              onClick={() => {
                dispatch({
                  type: "startAdding",
                  draft: {
                    id: generateId(),
                    title: "",
                    url: "",
                    linkType: "website",
                  },
                });
              }}
            />
          </div>
        )}

        {visibleCards.map((link) => (
          <div
            key={link.id}
            className={isSidebar ? "w-full" : "w-[calc(20%-10px)]"}
          >
            <QuicklinkCard
              link={link}
              onStartEdit={() => {
                dispatch({ type: "startEditing", draft: { ...link } });
              }}
              onRemove={async () => {
                const newLinks = savedLinks.filter((l) => l.id !== link.id);
                const success = await persistLinks(newLinks);
                if (success) {
                  setSavedLinks(newLinks);
                  if (editingId === link.id) {
                    dispatch({ type: "finishEditing" });
                  }
                  toast.success("Link removed");
                }
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function getSafeHref(url: string, linkType?: string): string | undefined {
  if (!url) return undefined;
  if (linkType === "app") return url;
  if (url.startsWith("/")) return url;
  try {
    const { protocol } = new URL(url);
    return protocol === "https:" || protocol === "http:" ? url : undefined;
  } catch {
    return undefined;
  }
}

function QuicklinkButton({ link }: { link: QuicklinkItem }) {
  if (!link.url) return null;

  const safeHref = getSafeHref(link.url, link.linkType);
  if (!safeHref) return null;

  const isApp = link.linkType === "app";

  return (
    <a
      href={safeHref}
      {...(isApp ? {} : { target: "_blank", rel: "noopener noreferrer" })}
      className="group w-full flex flex-col items-center gap-2 p-4 rounded-xl border bg-card hover:bg-primary/5 hover:border-primary/30 transition-all duration-200"
    >
      <div className="not-prose relative w-12 h-12 rounded-lg overflow-hidden bg-primary/10 flex items-center justify-center flex-shrink-0">
        {link.imageUrl ? (
          <Image
            src={link.imageUrl}
            alt={link.title || "Link"}
            fill
            unoptimized
            sizes="48px"
            className="object-cover"
          />
        ) : isApp ? (
          <AppWindow className="w-5 h-5 text-primary/70" />
        ) : (
          <ExternalLink className="w-5 h-5 text-primary/70" />
        )}
      </div>
      <span className="text-sm font-medium text-center line-clamp-2 group-hover:text-primary">
        {link.title || "Untitled"}
      </span>
    </a>
  );
}

export function QuicklinksRenderer({
  content,
}: ElementRendererProps<"quicklinks">) {
  const sectionContext = useSectionContext();
  const isSidebar = sectionContext?.isAside ?? false;

  const validLinks = (content.links || []).filter((link) => link.url);

  if (validLinks.length === 0) {
    return null;
  }

  if (isSidebar) {
    return (
      <div className="flex flex-col gap-3 my-6">
        {validLinks.map((link) => (
          <QuicklinkButton key={link.id} link={link} />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap justify-center gap-3 my-6">
      {validLinks.map((link) => (
        <div key={link.id} className="w-[calc(20%-10px)]">
          <QuicklinkButton link={link} />
        </div>
      ))}
    </div>
  );
}
