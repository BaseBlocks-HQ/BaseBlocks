"use client";

import { SLUG_PATTERN, generateSlug } from "@/lib/validation";
import { api } from "@baseblocks/backend";
import type { Id } from "@baseblocks/backend";
import { Button } from "@baseblocks/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@baseblocks/ui/dialog";
import type { PageListItem } from "@baseblocks/domain";
import { Input } from "@baseblocks/ui/input";
import { Label } from "@baseblocks/ui/label";
import { useMutation } from "convex/react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

interface RenamePageDialogProps {
  page: PageListItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RenamePageDialog({
  page,
  open,
  onOpenChange,
}: RenamePageDialogProps) {
  const t = useTranslations("navigation.renamePage");
  const tCommon = useTranslations("common");
  const [title, setTitle] = useState(page.title);
  const [slug, setSlug] = useState(page.slug);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const updatePage = useMutation(api.pages.mutations.update);

  const handleTitleChange = (value: string) => {
    setTitle(value);
    setSlug(generateSlug(value));
    setError("");
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setTitle(page.title);
      setSlug(page.slug);
    }
    setError("");
    onOpenChange(newOpen);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      await updatePage({
        pageId: page._id as Id<"pages">,
        title,
        slug,
      });
      onOpenChange(false);
      setIsSubmitting(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : t("renameFailed");
      setError(message);
      toast.error(message);
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className={
          "overflow-hidden rounded-[1.5rem] border-sidebar-border bg-sidebar p-0 text-sidebar-foreground shadow-2xl sm:max-w-[46rem] [&_[data-slot='dialog-close']]:top-4 [&_[data-slot='dialog-close']]:right-4"
        }
      >
        <DialogHeader className={"px-5 pt-4 pb-0"}>
          <DialogTitle className={"text-base font-semibold"}>
            {t("title")}
          </DialogTitle>
          <DialogDescription className={"text-sm text-sidebar-foreground/60"}>
            {t("description")}
          </DialogDescription>
        </DialogHeader>
        <form noValidate onSubmit={handleSubmit} className={"px-5 pb-3"}>
          <div className="space-y-2">
            <div className="space-y-2.5">
              <div>
                <Label
                  htmlFor="renameTitle"
                  className={
                    "mb-0.5 block text-xs font-medium tracking-wide text-sidebar-foreground/55"
                  }
                >
                  {t("titleLabel")}
                </Label>
                <Input
                  id="renameTitle"
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  aria-invalid={!!error}
                  className={
                    "h-auto border-0 bg-transparent px-0 py-0.5 text-[1.4rem] font-semibold leading-tight tracking-tight text-sidebar-foreground shadow-none placeholder:text-sidebar-foreground/40 focus-visible:ring-0 md:!text-[1.4rem] dark:bg-transparent"
                  }
                />
              </div>
              <div>
                <Label
                  htmlFor="renameSlug"
                  className={
                    "mb-0.5 block text-[11px] font-medium tracking-wide text-sidebar-foreground/45"
                  }
                >
                  {t("slugLabel")}
                </Label>
                <Input
                  id="renameSlug"
                  value={slug}
                  onChange={(e) => {
                    setSlug(e.target.value.toLowerCase());
                    setError("");
                  }}
                  aria-invalid={!!error}
                  pattern={SLUG_PATTERN}
                  className={
                    "h-auto border-0 bg-transparent px-0 py-0.5 text-[0.95rem] leading-snug text-sidebar-foreground/80 shadow-none placeholder:text-sidebar-foreground/35 focus-visible:ring-0 md:!text-[0.95rem] dark:bg-transparent"
                  }
                />
              </div>
            </div>

            {error ? (
              <p
                className={
                  "rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                }
              >
                {error}
              </p>
            ) : null}
            <DialogFooter className="pt-0.5">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isSubmitting}
                className={
                  "h-8 rounded-full border-sidebar-border/70 bg-transparent px-3.5 text-sm"
                }
              >
                {tCommon("cancel")}
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !title.trim()}
                className={"h-8 rounded-full px-4 text-sm"}
              >
                {isSubmitting ? t("saving") : t("save")}
              </Button>
            </DialogFooter>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
