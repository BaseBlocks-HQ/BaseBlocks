"use client";

import {
  Add01Icon,
  ArrowUpRight01Icon,
  Delete01Icon,
  Image01Icon,
  Link02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
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
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@baseblocks/ui/tooltip";
import { defineOpenEditorCustomBlockEditor } from "@openeditor/custom-block/editor";
import type { OpenEditorCustomBlockEditorHost } from "@openeditor/custom-block/editor";
import { useEffect, useRef, useState } from "react";
import { quickLinksBlock } from "./index";
import { QuickLinkAssetLoader } from "./quick-link-asset-loader";
import { destinationLabel, type QuickLink } from "./quick-links";
import { BlockShell } from "./ui";

const createId = () => crypto.randomUUID();
type LinkDraft = Omit<QuickLink, "id"> & { id: string | null };

const emptyDraft = (): LinkDraft => ({
  id: null,
  title: "",
  url: "",
});

export const quickLinksEditor = defineOpenEditorCustomBlockEditor({
  block: quickLinksBlock,
  render: function QuickLinksEditor({ data, host, updateData }) {
    const updateDataJson = (value: unknown) => updateData(value as typeof data);
    const [draft, setDraft] = useState<LinkDraft | null>(null);
    const resolved = draft
      ? host.links?.resolve({ href: draft.url, kind: "website" })
      : null;

    return (
      <BlockShell label="Edit quick links">
        <div className="grid grid-cols-2 gap-3">
          <button
            className="flex min-h-[70px] items-center justify-center gap-2 rounded-2xl border border-dashed text-sm font-medium text-muted-foreground transition-[color,background-color,border-color] hover:border-primary/40 hover:bg-primary/5 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => setDraft(emptyDraft())}
            type="button"
          >
            <HugeiconsIcon aria-hidden icon={Add01Icon} />
            Add link
          </button>
          {data.links.map((link) => (
            <button
              aria-label={`Edit ${link.title}`}
              className="group flex min-h-[70px] min-w-0 items-center gap-3 rounded-2xl bg-card p-3 text-left transition-[transform,background-color] hover:-translate-y-0.5 hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              key={link.id}
              onClick={() => setDraft({ ...link })}
              type="button"
            >
              <span className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary/10 text-primary">
                {link.imageAssetId ? (
                  <QuickLinkEditorAsset
                    assetId={link.imageAssetId}
                    host={host}
                  />
                ) : (
                  <HugeiconsIcon aria-hidden icon={Link02Icon} />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">
                  {link.title}
                </span>
                <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                  {destinationLabel(link)}
                </span>
              </span>
              <HugeiconsIcon
                aria-hidden
                className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                icon={ArrowUpRight01Icon}
              />
            </button>
          ))}
        </div>

        <Dialog
          onOpenChange={(open) => {
            if (!open) setDraft(null);
          }}
          open={draft !== null}
        >
          {draft ? (
            <DialogContent className="w-[calc(100%-1.5rem)] max-w-[26rem] gap-0 overflow-hidden rounded-2xl border-0 bg-background/80 p-0 text-foreground shadow-2xl backdrop-blur-xl backdrop-saturate-150 sm:max-w-[26rem] [&_[data-slot='dialog-close']]:top-2 [&_[data-slot='dialog-close']]:right-2 [&_[data-slot='dialog-close']]:flex [&_[data-slot='dialog-close']]:size-8 [&_[data-slot='dialog-close']]:items-center [&_[data-slot='dialog-close']]:justify-center [&_[data-slot='dialog-close']]:rounded-lg">
              <DialogHeader className="px-4 pt-4 pe-12">
                <DialogTitle className="brand-display text-2xl leading-none font-normal tracking-[-0.025em]">
                  {draft.id ? "Edit quick link" : "Add quick link"}
                </DialogTitle>
              </DialogHeader>
              <form
                className="grid gap-4 px-4 pt-4 pb-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!resolved || !draft.title.trim()) return;
                  const value: QuickLink = {
                    id: draft.id ?? createId(),
                    title: draft.title.trim(),
                    url: draft.url.trim(),
                    imageAssetId: draft.imageAssetId,
                  };
                  updateDataJson({
                    links: draft.id
                      ? data.links.map((link) =>
                          link.id === draft.id ? value : link,
                        )
                      : [...data.links, value],
                  });
                  setDraft(null);
                }}
              >
                <div className="grid gap-1.5">
                  <Label htmlFor="quick-link-title">Title</Label>
                  <Input
                    autoFocus
                    id="quick-link-title"
                    onChange={(event) =>
                      setDraft({ ...draft, title: event.target.value })
                    }
                    value={draft.title}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="quick-link-destination">Website URL</Label>
                  <Input
                    aria-invalid={Boolean(draft.url && !resolved)}
                    id="quick-link-destination"
                    onChange={(event) =>
                      setDraft({ ...draft, url: event.target.value })
                    }
                    placeholder="https://example.com"
                    value={draft.url}
                  />
                  {draft.url && !resolved ? (
                    <p className="text-xs text-destructive">
                      Enter an HTTP, HTTPS, or site-relative URL.
                    </p>
                  ) : null}
                </div>
                {host.assets?.pick ? (
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-sm font-medium">Image</p>
                    <div className="group relative shrink-0">
                      <button
                        aria-label={
                          draft.imageAssetId
                            ? "Replace quick link image"
                            : "Choose quick link image"
                        }
                        className="group flex h-20 w-28 items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-muted-foreground/25 bg-background text-muted-foreground transition-[border-color,background-color] hover:border-muted-foreground/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                        onClick={async () => {
                          const asset = await host.assets?.pick?.();
                          if (asset)
                            setDraft({ ...draft, imageAssetId: asset.id });
                        }}
                        type="button"
                      >
                        {draft.imageAssetId ? (
                          <>
                            <QuickLinkEditorAsset
                              assetId={draft.imageAssetId}
                              host={host}
                            />
                            <span className="absolute inset-x-0 bottom-0 bg-background/90 py-1 text-center text-[11px] text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                              Replace
                            </span>
                          </>
                        ) : (
                          <HugeiconsIcon
                            aria-hidden
                            className="size-5"
                            icon={Image01Icon}
                          />
                        )}
                      </button>
                      {draft.imageAssetId ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              aria-label="Remove quick link image"
                              className="absolute top-1 end-1 size-7 bg-background/90 text-muted-foreground opacity-100 shadow-sm transition-opacity hover:text-destructive sm:opacity-0 sm:group-hover:opacity-100"
                              onClick={() =>
                                setDraft({
                                  ...draft,
                                  imageAssetId: undefined,
                                })
                              }
                              size="icon-xs"
                              type="button"
                              variant="ghost"
                            >
                              <HugeiconsIcon aria-hidden icon={Delete01Icon} />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent sideOffset={6}>Remove</TooltipContent>
                        </Tooltip>
                      ) : null}
                    </div>
                  </div>
                ) : null}
                <DialogFooter
                  className={
                    draft.id ? "pt-1 sm:justify-between" : "pt-1 sm:justify-end"
                  }
                >
                  {draft.id ? (
                    <Button
                      className="mr-auto text-destructive hover:text-destructive"
                      onClick={() => {
                        updateDataJson({
                          links: data.links.filter(({ id }) => id !== draft.id),
                        });
                        setDraft(null);
                      }}
                      type="button"
                      variant="ghost"
                    >
                      <HugeiconsIcon aria-hidden icon={Delete01Icon} />
                      Delete
                    </Button>
                  ) : null}
                  <Button
                    disabled={!draft.title.trim() || !resolved}
                    type="submit"
                  >
                    Save
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          ) : null}
        </Dialog>
      </BlockShell>
    );
  },
});

function QuickLinkEditorAsset({
  assetId,
  host,
}: {
  assetId: string;
  host: OpenEditorCustomBlockEditorHost;
}) {
  const [asset, setAsset] = useState<{ src: string; alt: string } | null>(null);
  const loader = useRef(new QuickLinkAssetLoader());
  useEffect(() => {
    loader.current.load(assetId, host, setAsset);
    return () => loader.current.cancel();
  }, [assetId, host]);
  return asset ? (
    <img alt={asset.alt} className="size-full object-cover" src={asset.src} />
  ) : (
    <HugeiconsIcon aria-hidden icon={Image01Icon} />
  );
}
