"use client";

import {
  Add01Icon,
  ArrowUpRight01Icon,
  Link02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { defineOpenEditorCustomBlockEditor } from "@openeditor/custom-block/editor";
import { useState } from "react";
import { quickLinksBlock } from "./index";
import { QuickLinkDialog } from "./quick-link-dialog";
import { QuickLinkEditorAsset } from "./quick-link-editor-asset";
import { destinationLabel, type QuickLink } from "./quick-links";
import { BlockShell } from "./ui";

export const quickLinksEditor = defineOpenEditorCustomBlockEditor({
  block: quickLinksBlock,
  render: function QuickLinksEditor({ data, host, updateData }) {
    const [editingLink, setEditingLink] = useState<QuickLink | "new" | null>(
      null,
    );

    return (
      <BlockShell label="Edit quick links">
        <div className="grid grid-cols-2 gap-3">
          <button
            className="flex min-h-[70px] items-center justify-center gap-2 rounded-2xl border border-dashed text-sm font-medium text-muted-foreground transition-[color,background-color,border-color] hover:border-primary/40 hover:bg-primary/5 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => setEditingLink("new")}
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
              onClick={() => setEditingLink(link)}
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

        {editingLink ? (
          <QuickLinkDialog
            host={host}
            initialLink={editingLink === "new" ? null : editingLink}
            onClose={() => setEditingLink(null)}
            onDelete={
              editingLink === "new"
                ? undefined
                : () => {
                    updateData({
                      links: data.links.filter(
                        ({ id }) => id !== editingLink.id,
                      ),
                    });
                    setEditingLink(null);
                  }
            }
            onSave={(value) => {
              updateData({
                links:
                  editingLink === "new"
                    ? [...data.links, value]
                    : data.links.map((link) =>
                        link.id === editingLink.id ? value : link,
                      ),
              });
              setEditingLink(null);
            }}
          />
        ) : null}
      </BlockShell>
    );
  },
});
