"use client";

import {
  Add01Icon,
  AppWindowIcon,
  ArrowDown01Icon,
  ArrowUp01Icon,
  Copy01Icon,
  Delete01Icon,
  ImageAdd01Icon,
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
import { defineOpenEditorCustomBlockEditor } from "@openeditor/custom-block/editor";
import { type ReactNode, useState } from "react";
import { quickLinksBlock } from "./index";
import {
  destinationLabel,
  duplicateQuickLink,
  moveQuickLink,
  type QuickLink,
} from "./quick-links";
import { ActionMenu, BlockShell, selectClassName } from "./ui";

const createId = () => crypto.randomUUID();
type LinkDraft = Omit<QuickLink, "id"> & { id: string | null };

const emptyDraft = (): LinkDraft => ({
  id: null,
  title: "",
  url: "",
  linkType: "website",
});

export const quickLinksEditor = defineOpenEditorCustomBlockEditor({
  block: quickLinksBlock,
  render: function QuickLinksEditor({ data, host, updateData }) {
    const updateDataJson = (value: unknown) => updateData(value as typeof data);
    const [draft, setDraft] = useState<LinkDraft | null>(null);
    const resolved = draft
      ? host.links?.resolve({ href: draft.url, kind: draft.linkType })
      : null;

    return (
      <BlockShell label="Edit quick links">
        <div className="grid gap-3 sm:grid-cols-2">
          {data.links.map((link, index) => (
            <article
              className="flex min-w-0 items-center gap-3 rounded-xl border bg-card p-3"
              key={link.id}
            >
              <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-primary/10 text-primary">
                {link.artwork?.kind === "icon" && host.icons ? (
                  (host.icons.render(link.artwork.id) as ReactNode)
                ) : link.artwork?.kind === "asset" ? (
                  <HugeiconsIcon aria-hidden icon={ImageAdd01Icon} />
                ) : link.linkType === "app" ? (
                  <HugeiconsIcon aria-hidden icon={AppWindowIcon} />
                ) : (
                  <HugeiconsIcon aria-hidden icon={Link02Icon} />
                )}
              </span>
              <button
                className="min-w-0 flex-1 rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => setDraft({ ...link })}
                type="button"
              >
                <span className="block truncate text-sm font-medium">
                  {link.title}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  {destinationLabel(link)}
                </span>
              </button>
              <ActionMenu
                items={[
                  {
                    icon: Copy01Icon,
                    label: "Duplicate link",
                    onSelect: () =>
                      updateDataJson({
                        links: [
                          ...data.links.slice(0, index + 1),
                          duplicateQuickLink(link, createId()),
                          ...data.links.slice(index + 1),
                        ],
                      }),
                  },
                  {
                    disabled: index === 0,
                    icon: ArrowUp01Icon,
                    label: "Move up",
                    onSelect: () =>
                      updateDataJson({
                        links: moveQuickLink(data.links, link.id, -1),
                      }),
                    separatorBefore: true,
                  },
                  {
                    disabled: index + 1 === data.links.length,
                    icon: ArrowDown01Icon,
                    label: "Move down",
                    onSelect: () =>
                      updateDataJson({
                        links: moveQuickLink(data.links, link.id, 1),
                      }),
                  },
                  {
                    destructive: true,
                    icon: Delete01Icon,
                    label: "Delete link",
                    onSelect: () =>
                      updateDataJson({
                        links: data.links.filter(({ id }) => id !== link.id),
                      }),
                    separatorBefore: true,
                  },
                ]}
                label={`${link.title} actions`}
              />
            </article>
          ))}
          <button
            className="flex min-h-16 items-center justify-center gap-2 rounded-xl border border-dashed text-sm font-medium text-muted-foreground outline-none hover:border-foreground/30 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => setDraft(emptyDraft())}
            type="button"
          >
            <HugeiconsIcon aria-hidden icon={Add01Icon} />
            Add link
          </button>
        </div>

        <Dialog
          onOpenChange={(open) => {
            if (!open) setDraft(null);
          }}
          open={draft !== null}
        >
          {draft ? (
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{draft.id ? "Edit link" : "Add link"}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4">
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
                  <Label htmlFor="quick-link-destination">Destination</Label>
                  <Input
                    aria-invalid={Boolean(draft.url && !resolved)}
                    id="quick-link-destination"
                    onChange={(event) =>
                      setDraft({ ...draft, url: event.target.value })
                    }
                    placeholder={
                      draft.linkType === "app"
                        ? "myapp://open"
                        : "https://example.com"
                    }
                    value={draft.url}
                  />
                  {draft.url && !resolved ? (
                    <p className="text-xs text-destructive">
                      Enter a valid destination.
                    </p>
                  ) : null}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <Label htmlFor="quick-link-type">Link type</Label>
                    <select
                      className={`${selectClassName} w-full`}
                      id="quick-link-type"
                      onChange={(event) =>
                        setDraft({
                          ...draft,
                          linkType:
                            event.target.value === "app" ? "app" : "website",
                        })
                      }
                      value={draft.linkType}
                    >
                      <option value="website">Website</option>
                      <option value="app">App</option>
                    </select>
                  </div>
                  {host.icons ? (
                    <div className="grid gap-1.5">
                      <Label htmlFor="quick-link-icon">Icon</Label>
                      <select
                        className={`${selectClassName} w-full`}
                        id="quick-link-icon"
                        onChange={(event) =>
                          setDraft({
                            ...draft,
                            artwork: event.target.value
                              ? { kind: "icon", id: event.target.value }
                              : undefined,
                          })
                        }
                        value={
                          draft.artwork?.kind === "icon" ? draft.artwork.id : ""
                        }
                      >
                        <option value="">No icon</option>
                        {host.icons.list().map((icon) => (
                          <option key={icon.id} value={icon.id}>
                            {icon.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : null}
                </div>
                {host.assets?.pick ? (
                  <Button
                    className="w-fit"
                    onClick={async () => {
                      const asset = await host.assets?.pick?.();
                      if (asset)
                        setDraft({
                          ...draft,
                          artwork: { kind: "asset", assetId: asset.id },
                        });
                    }}
                    type="button"
                    variant="outline"
                  >
                    <HugeiconsIcon aria-hidden icon={ImageAdd01Icon} />
                    {draft.artwork?.kind === "asset"
                      ? "Change image"
                      : "Choose image"}
                  </Button>
                ) : null}
              </div>
              <DialogFooter>
                {draft.id ? (
                  <Button
                    className="mr-auto"
                    onClick={() => {
                      updateDataJson({
                        links: data.links.filter(({ id }) => id !== draft.id),
                      });
                      setDraft(null);
                    }}
                    type="button"
                    variant="ghost"
                  >
                    Delete
                  </Button>
                ) : null}
                <Button
                  onClick={() => setDraft(null)}
                  type="button"
                  variant="outline"
                >
                  Cancel
                </Button>
                <Button
                  disabled={!draft.title.trim() || !resolved}
                  onClick={() => {
                    if (!resolved) return;
                    const value: QuickLink = {
                      id: draft.id ?? createId(),
                      title: draft.title.trim(),
                      url: draft.url,
                      linkType: draft.linkType,
                      artwork: draft.artwork,
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
                  type="button"
                >
                  Save
                </Button>
              </DialogFooter>
            </DialogContent>
          ) : null}
        </Dialog>
      </BlockShell>
    );
  },
});
