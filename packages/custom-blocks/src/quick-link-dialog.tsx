"use client";

import { Delete01Icon, Image01Icon } from "@hugeicons/core-free-icons";
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
import type { OpenEditorCustomBlockEditorHost } from "@openeditor/custom-block/editor";
import { useEffect, useRef, useState } from "react";
import { QuickLinkEditorAsset } from "./quick-link-editor-asset";
import type { QuickLink } from "./quick-links";

type DraftImage = {
  originalId?: string;
  currentId?: string;
};

type LinkDraft = {
  id: string | null;
  title: string;
  url: string;
  image: DraftImage;
};

const createDraft = (link: QuickLink | null): LinkDraft => ({
  id: link?.id ?? null,
  title: link?.title ?? "",
  url: link?.url ?? "",
  image: {
    originalId: link?.imageAssetId,
    currentId: link?.imageAssetId,
  },
});

export function QuickLinkDialog({
  host,
  initialLink,
  onClose,
  onDelete,
  onSave,
}: {
  host: OpenEditorCustomBlockEditorHost;
  initialLink: QuickLink | null;
  onClose: () => void;
  onDelete?: () => void;
  onSave: (link: QuickLink) => void;
}) {
  const [draft, setDraft] = useState(() => createDraft(initialLink));
  const draftRef = useRef(draft);
  const operation = useRef(0);
  const mounted = useRef(true);
  const resolved = host.links?.resolve({ href: draft.url, kind: "website" });

  useEffect(
    () => () => {
      mounted.current = false;
      operation.current += 1;
    },
    [],
  );
  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  const discardPending = (image: DraftImage) => {
    if (image.currentId && image.currentId !== image.originalId) {
      void discardAsset(host, image.currentId);
    }
  };
  const close = () => {
    operation.current += 1;
    discardPending(draft.image);
    onClose();
  };
  const chooseImage = async () => {
    const currentOperation = operation.current + 1;
    operation.current = currentOperation;
    const asset = await host.assets?.pick?.();
    if (!asset) return;
    if (!mounted.current || currentOperation !== operation.current) {
      await discardAsset(host, asset.id);
      return;
    }
    const current = draftRef.current;
    discardPending(current.image);
    const next = {
      ...current,
      image: { ...current.image, currentId: asset.id },
    };
    draftRef.current = next;
    setDraft(next);
  };

  return (
    <Dialog onOpenChange={(open) => !open && close()} open>
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
            operation.current += 1;
            onSave({
              id: draft.id ?? crypto.randomUUID(),
              title: draft.title.trim(),
              url: draft.url.trim(),
              imageAssetId: draft.image.currentId,
            });
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
            <ImageField
              imageId={draft.image.currentId}
              host={host}
              onChoose={chooseImage}
              onRemove={() => {
                operation.current += 1;
                discardPending(draft.image);
                setDraft({
                  ...draft,
                  image: { ...draft.image, currentId: undefined },
                });
              }}
            />
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
                  operation.current += 1;
                  discardPending(draft.image);
                  onDelete?.();
                }}
                type="button"
                variant="ghost"
              >
                <HugeiconsIcon aria-hidden icon={Delete01Icon} />
                Delete
              </Button>
            ) : null}
            <Button disabled={!draft.title.trim() || !resolved} type="submit">
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ImageField({
  imageId,
  host,
  onChoose,
  onRemove,
}: {
  imageId?: string;
  host: OpenEditorCustomBlockEditorHost;
  onChoose: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <p className="text-sm font-medium">Image</p>
      <div className="group relative shrink-0">
        <button
          aria-label={
            imageId ? "Replace quick link image" : "Choose quick link image"
          }
          className="group flex h-20 w-28 items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-muted-foreground/25 bg-background text-muted-foreground transition-[border-color,background-color] hover:border-muted-foreground/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          onClick={onChoose}
          type="button"
        >
          {imageId ? (
            <>
              <QuickLinkEditorAsset assetId={imageId} host={host} />
              <span className="absolute inset-x-0 bottom-0 bg-background/90 py-1 text-center text-[11px] text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                Replace
              </span>
            </>
          ) : (
            <HugeiconsIcon aria-hidden className="size-5" icon={Image01Icon} />
          )}
        </button>
        {imageId ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                aria-label="Remove quick link image"
                className="absolute top-1 end-1 size-7 bg-background/90 text-muted-foreground opacity-100 shadow-sm transition-opacity hover:text-destructive sm:opacity-0 sm:group-hover:opacity-100"
                onClick={onRemove}
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
  );
}

async function discardAsset(
  host: OpenEditorCustomBlockEditorHost,
  assetId: string,
) {
  const assets = host.assets as
    | (NonNullable<OpenEditorCustomBlockEditorHost["assets"]> & {
        discard?: (id: string) => Promise<void>;
      })
    | undefined;
  await assets?.discard?.(assetId);
}
