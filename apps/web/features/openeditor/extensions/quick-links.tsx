"use client";

import { useSiteRenderActions } from "@/components/site-runtime/actions";
import { baseBlocksSlashMenuOrder } from "@/features/openeditor/slash-menu";
import { filesClient } from "@/lib/files/upload";
import { api } from "@baseblocks/backend";
import type { QuicklinkItem } from "@baseblocks/domain";
import { Button } from "@baseblocks/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@baseblocks/ui/dialog";
import { Input } from "@baseblocks/ui/input";
import { Label } from "@baseblocks/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@baseblocks/ui/select";
import {
  defineOpenEditorReactNode,
  NodeViewWrapper,
  type OpenEditorNodeViewProps,
} from "@openeditor/react";
import { useMutation } from "convex/react";
import {
  AppWindow,
  ArrowUpRight,
  Check,
  ImagePlus,
  Link2,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import Image from "next/image";
import { useRef, useState } from "react";

type LinkDraft = {
  originalId: string | null;
  value: QuicklinkItem;
};

function readLinks(value: unknown): QuicklinkItem[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const link = item as Partial<QuicklinkItem>;
    if (
      typeof link.id !== "string" ||
      typeof link.title !== "string" ||
      typeof link.url !== "string"
    )
      return [];
    return [
      {
        id: link.id,
        title: link.title,
        url: link.url,
        linkType: link.linkType === "app" ? "app" : "website",
        ...(typeof link.imageUrl === "string" && link.imageUrl
          ? { imageUrl: link.imageUrl }
          : {}),
      },
    ];
  });
}

function safeHref(link: QuicklinkItem) {
  const url = link.url.trim();
  if (!url) return null;
  if (link.linkType === "app") {
    return /^[a-z][a-z\d+.-]*:\/\//i.test(url) &&
      !/^(?:javascript|data|vbscript):/i.test(url)
      ? url
      : null;
  }
  if (url.startsWith("/") && !url.startsWith("//")) return url;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:"
      ? url
      : null;
  } catch {
    return null;
  }
}

function destinationLabel(link: QuicklinkItem) {
  if (link.linkType === "app") return "Open app";
  if (link.url.startsWith("/")) return "BaseBlocks page";
  try {
    return new URL(link.url).hostname.replace(/^www\./, "");
  } catch {
    return "Website";
  }
}

function LinkArtwork({ link }: { link: QuicklinkItem }) {
  return (
    <span className="relative isolate flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary/10 text-primary [&>img]:!m-0 [&>img]:!size-full [&>img]:!max-w-none [&>img]:!object-cover">
      {link.imageUrl ? (
        <Image
          alt=""
          className="object-cover"
          fill
          sizes="44px"
          src={link.imageUrl}
          style={{ objectFit: "cover" }}
          unoptimized
        />
      ) : link.linkType === "app" ? (
        <AppWindow className="size-5" />
      ) : (
        <Link2 className="size-5" />
      )}
    </span>
  );
}

function QuickLinkCard({
  editable,
  link,
  onEdit,
}: {
  editable: boolean;
  link: QuicklinkItem;
  onEdit?: () => void;
}) {
  const href = safeHref(link);
  const content = (
    <>
      <LinkArtwork link={link} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">
          {link.title || "Untitled link"}
        </span>
        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
          {destinationLabel(link)}
        </span>
      </span>
      <ArrowUpRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground" />
    </>
  );

  if (editable)
    return (
      <button
        aria-label={`Edit ${link.title || "quick link"}`}
        className="group flex min-w-0 items-center gap-3 rounded-2xl bg-card p-3 text-left transition hover:-translate-y-0.5 hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={onEdit}
        type="button"
      >
        {content}
      </button>
    );

  if (!href) return null;
  return (
    <a
      className="group flex min-w-0 items-center gap-3 rounded-2xl bg-card p-3 transition hover:-translate-y-0.5 hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      href={href}
      {...(link.linkType === "app" || href.startsWith("/")
        ? {}
        : { rel: "noopener noreferrer", target: "_blank" })}
    >
      {content}
    </a>
  );
}

function useImageUpload() {
  const { siteId } = useSiteRenderActions();
  const createSiteAsset = useMutation(api.files.createSiteAsset);

  return async (file: File) => {
    if (!siteId) throw new Error("Image uploads require a site.");
    if (!file.type.startsWith("image/"))
      throw new Error("Choose an image file.");
    let objectKey: string | null = null;
    try {
      const uploaded = await filesClient.upload(file, {
        siteId,
        purpose: "siteAsset",
      });
      objectKey = uploaded.objectKey;
      const asset = await createSiteAsset({
        siteId,
        objectKey,
        filename: file.name,
        contentType: uploaded.contentType,
        size: uploaded.size,
        checksum: uploaded.checksum,
      });
      return asset.url;
    } catch (error) {
      if (objectKey)
        await filesClient
          .cleanup({ siteId, purpose: "siteAsset", objectKey })
          .catch(() => undefined);
      throw error;
    }
  };
}

function QuickLinkForm({
  draft,
  onCancel,
  onChange,
  onDelete,
  onSave,
}: {
  draft: LinkDraft;
  onCancel: () => void;
  onChange: (value: QuicklinkItem) => void;
  onDelete?: () => void;
  onSave: () => void;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const uploadImage = useImageUpload();
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const href = safeHref(draft.value);
  const canSave = Boolean(draft.value.title.trim() && href && !uploading);

  const selectImage = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    try {
      onChange({ ...draft.value, imageUrl: await uploadImage(file) });
    } catch (error) {
      setUploadError(
        error instanceof Error ? error.message : "Image upload failed.",
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-[32rem] overflow-hidden rounded-[1.5rem] border-sidebar-border bg-sidebar p-0 text-sidebar-foreground shadow-2xl sm:max-w-[32rem] [&_[data-slot='dialog-close']]:right-4 [&_[data-slot='dialog-close']]:top-4">
        <DialogHeader className="px-5 pt-4 pb-0">
          <DialogTitle className="text-base font-semibold">
            {draft.originalId ? "Edit quick link" : "Add quick link"}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 px-5 sm:grid-cols-[5rem_minmax(0,1fr)]">
          <div className="relative mx-auto shrink-0 sm:mx-0">
            <input
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                void selectImage(event.target.files?.[0]);
                event.target.value = "";
              }}
              ref={fileInput}
              type="file"
            />
            <button
              aria-label={
                draft.value.imageUrl ? "Change link image" : "Add link image"
              }
              className="relative isolate flex size-20 items-center justify-center overflow-hidden rounded-2xl border border-dashed bg-muted/40 text-muted-foreground hover:border-primary/50 hover:text-foreground disabled:opacity-60 [&>img]:!m-0 [&>img]:!size-full [&>img]:!max-w-none [&>img]:!object-cover"
              disabled={uploading}
              onClick={() => fileInput.current?.click()}
              type="button"
            >
              {draft.value.imageUrl ? (
                <Image
                  alt=""
                  className="object-cover"
                  fill
                  sizes="80px"
                  src={draft.value.imageUrl}
                  style={{ objectFit: "cover" }}
                  unoptimized
                />
              ) : (
                <ImagePlus className="size-4" />
              )}
            </button>
            {draft.value.imageUrl ? (
              <button
                aria-label="Remove link image"
                className="absolute -right-2 -top-2 flex size-6 items-center justify-center rounded-full border bg-background shadow-sm"
                onClick={() =>
                  onChange({ ...draft.value, imageUrl: undefined })
                }
                type="button"
              >
                <X className="size-3" />
              </button>
            ) : null}
          </div>

          <div className="grid min-w-0 gap-3">
            <Label
              className="grid gap-1.5 text-xs font-medium tracking-wide text-sidebar-foreground/55"
              htmlFor="quick-link-title"
            >
              Title
              <Input
                autoFocus
                className="h-10 rounded-[0.95rem] border-sidebar-border/80 bg-background/70 text-sidebar-foreground shadow-[inset_0_1px_0_hsl(var(--background)/0.35)]"
                id="quick-link-title"
                onChange={(event) =>
                  onChange({ ...draft.value, title: event.target.value })
                }
                onKeyDown={(event) => {
                  if (event.key === "Escape") onCancel();
                }}
                placeholder="Title"
                value={draft.value.title}
              />
            </Label>
            <Label
              className="grid gap-1.5 text-xs font-medium tracking-wide text-sidebar-foreground/55"
              htmlFor="quick-link-address"
            >
              Destination
              <Input
                aria-invalid={Boolean(draft.value.url && !href)}
                className="h-10 rounded-[0.95rem] border-sidebar-border/80 bg-background/70 text-sidebar-foreground shadow-[inset_0_1px_0_hsl(var(--background)/0.35)]"
                id="quick-link-address"
                onChange={(event) =>
                  onChange({ ...draft.value, url: event.target.value })
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter" && canSave) onSave();
                  if (event.key === "Escape") onCancel();
                }}
                placeholder={
                  draft.value.linkType === "app"
                    ? "myapp://open"
                    : "https://example.com"
                }
                value={draft.value.url}
              />
            </Label>
            <div className="grid gap-1.5">
              <Label className="text-xs font-medium tracking-wide text-sidebar-foreground/55">
                Link type
              </Label>
              <Select
                onValueChange={(value) =>
                  onChange({
                    ...draft.value,
                    linkType: value === "app" ? "app" : "website",
                  })
                }
                value={draft.value.linkType ?? "website"}
              >
                <SelectTrigger className="h-10 w-full rounded-[0.95rem] border-sidebar-border/80 bg-background/70 text-sidebar-foreground shadow-[inset_0_1px_0_hsl(var(--background)/0.35)]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-[1rem] border-sidebar-border bg-sidebar text-sidebar-foreground shadow-2xl">
                  <SelectItem
                    className="rounded-[0.7rem] focus:bg-sidebar-accent focus:text-sidebar-accent-foreground"
                    value="website"
                  >
                    Website
                  </SelectItem>
                  <SelectItem
                    className="rounded-[0.7rem] focus:bg-sidebar-accent focus:text-sidebar-accent-foreground"
                    value="app"
                  >
                    App link
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="min-h-4 text-xs text-destructive">
              {uploadError ??
                (draft.value.url && !href
                  ? "Enter a valid link address."
                  : null)}
            </div>
          </div>
        </div>

        <DialogFooter className="px-5 pb-4 sm:justify-between">
          {onDelete ? (
            <Button
              className="text-destructive hover:text-destructive"
              onClick={onDelete}
              type="button"
              variant="ghost"
            >
              <Trash2 className="size-4" />
              Delete
            </Button>
          ) : (
            <span />
          )}
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button
              className="h-8 rounded-full border-sidebar-border/70 bg-transparent px-3.5 text-sm"
              onClick={onCancel}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              className="h-8 rounded-full px-4 text-sm"
              disabled={!canSave}
              onClick={onSave}
              type="button"
            >
              <Check className="size-4" />
              Save
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function QuickLinksGrid({
  editable,
  links,
  onChange,
}: {
  editable: boolean;
  links: QuicklinkItem[];
  onChange?: (links: QuicklinkItem[]) => void;
}) {
  const [draft, setDraft] = useState<LinkDraft | null>(null);
  const startNew = () =>
    setDraft({
      originalId: null,
      value: {
        id: crypto.randomUUID(),
        title: "",
        url: "",
        linkType: "website",
      },
    });
  const save = () => {
    if (!draft || !safeHref(draft.value) || !draft.value.title.trim()) return;
    const value = {
      ...draft.value,
      title: draft.value.title.trim(),
      url: draft.value.url.trim(),
    };
    onChange?.(
      draft.originalId
        ? links.map((link) => (link.id === draft.originalId ? value : link))
        : [...links, value],
    );
    setDraft(null);
  };

  if (!editable && links.every((link) => !safeHref(link))) return null;

  return (
    <section className="not-prose my-4">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,15rem),1fr))] gap-3">
        {editable ? (
          <button
            className="flex min-h-[70px] items-center justify-center gap-2 rounded-2xl border border-dashed text-sm font-medium text-muted-foreground transition hover:border-primary/40 hover:bg-primary/5 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={draft ? undefined : startNew}
            type="button"
          >
            <Plus className="size-4" />
            Add link
          </button>
        ) : null}
        {links.map((link) => (
          <QuickLinkCard
            editable={editable}
            key={link.id}
            link={link}
            onEdit={() => setDraft({ originalId: link.id, value: { ...link } })}
          />
        ))}
      </div>
      {draft ? (
        <QuickLinkForm
          draft={draft}
          onCancel={() => setDraft(null)}
          onChange={(value) => setDraft({ ...draft, value })}
          onDelete={
            draft.originalId
              ? () => {
                  onChange?.(
                    links.filter((link) => link.id !== draft.originalId),
                  );
                  setDraft(null);
                }
              : undefined
          }
          onSave={save}
        />
      ) : null}
    </section>
  );
}

function QuickLinksNode({
  editor,
  node,
  updateAttributes,
}: OpenEditorNodeViewProps) {
  return (
    <NodeViewWrapper contentEditable={false}>
      <QuickLinksGrid
        editable={editor.isEditable}
        links={readLinks(node.attrs.links)}
        onChange={(links) => updateAttributes({ links })}
      />
    </NodeViewWrapper>
  );
}

export const quickLinksExtension = defineOpenEditorReactNode({
  block: {
    name: "baseblocks.quickLinks",
    nodeType: "baseblocksQuickLinks",
    label: "Quick Links",
    group: "embed",
    defaultNode: () => ({
      type: "baseblocksQuickLinks",
      attrs: { links: [] },
    }),
    support: { web: "supported", native: "unsupported" },
  },
  node: {
    group: "block",
    atom: true,
    draggable: true,
    addAttributes: () => ({ links: { default: [] } }),
    parseHTML: () => [{ tag: "section[data-baseblocks-quick-links]" }],
    renderHTML: ({ HTMLAttributes }) => [
      "section",
      { ...HTMLAttributes, "data-baseblocks-quick-links": "" },
    ],
  },
  component: QuickLinksNode,
  slashMenu: {
    icon: AppWindow,
    keywords: ["links", "cards", "bookmarks", "shortcuts"],
    order: baseBlocksSlashMenuOrder.quickLinks,
  },
  viewer: ({ node }) => (
    <QuickLinksGrid editable={false} links={readLinks(node.attrs?.links)} />
  ),
  exporters: {
    html: {
      baseblocksQuickLinks: ({ node, escapeAttribute, escapeHtml }) =>
        readLinks(node.attrs?.links)
          .filter((link) => safeHref(link))
          .map(
            (link) =>
              `<a href="${escapeAttribute(link.url)}">${escapeHtml(link.title)}</a>`,
          )
          .join("\n"),
    },
    text: {
      baseblocksQuickLinks: ({ node }) =>
        readLinks(node.attrs?.links)
          .filter((link) => safeHref(link))
          .map((link) => `${link.title}: ${link.url}`)
          .join("\n"),
    },
  },
});
