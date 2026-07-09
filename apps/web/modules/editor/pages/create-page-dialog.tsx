"use client";

import { SLUG_PATTERN, generateSlug, uniqueSlugAmong } from "@baseblocks/domain";
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
  DialogTrigger,
} from "@baseblocks/ui/dialog";
import { Input } from "@baseblocks/ui/input";
import { Label } from "@baseblocks/ui/label";
import { useMutation, useQuery } from "convex/react";
import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

interface CreatePageDialogProps {
  siteId: string;
  parentId?: string;
}

export function CreatePageDialog({ siteId, parentId }: CreatePageDialogProps) {
  const t = useTranslations("dialogs.createPage");
  const tCommon = useTranslations("common");

  const [dialogState, setDialogState] = useState({
    open: false,
    title: "",
    slug: "",
    isSubmitting: false,
    error: "",
  });

  const [slugLockedByUser, setSlugLockedByUser] = useState(false);

  const createPage = useMutation(api.pages.mutations.create);
  const pages = useQuery(
    api.pages.queries.list,
    dialogState.open ? { siteId: siteId as Id<"sites"> } : "skip",
  );
  const usedSlugs = new Set(
    (pages ?? []).map((page) => page.slug.toLowerCase()),
  );
  const autoSlug = uniqueSlugAmong(generateSlug(dialogState.title), usedSlugs);
  const slugValue = slugLockedByUser ? dialogState.slug : autoSlug;

  const handleTitleChange = (value: string) => {
    setSlugLockedByUser(false);
    setDialogState((current) => {
      return {
        ...current,
        title: value,
        error: "",
      };
    });
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setSlugLockedByUser(false);
    }
    setDialogState((current) => ({
      ...current,
      open: newOpen,
      error: newOpen ? current.error : "",
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setDialogState((current) => ({
      ...current,
      error: "",
      isSubmitting: true,
    }));

    try {
      await createPage({
        siteId: siteId as Id<"sites">,
        title: dialogState.title,
        slug: slugValue,
        parentId: parentId as Id<"pages"> | undefined,
      });
      setSlugLockedByUser(false);
      setDialogState({
        open: false,
        title: "",
        slug: "",
        isSubmitting: false,
        error: "",
      });
      toast.success(t("pageCreated"));
    } catch (err) {
      const message = err instanceof Error ? err.message : t("createFailed");
      setDialogState((current) => ({
        ...current,
        error: message,
        isSubmitting: false,
      }));
      toast.error(message);
    }
  };

  return (
    <Dialog open={dialogState.open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-6 w-6">
          <Plus className="h-4 w-4" />
        </Button>
      </DialogTrigger>
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
                  htmlFor="pageTitle"
                  className={
                    "mb-0.5 block text-xs font-medium tracking-wide text-sidebar-foreground/55"
                  }
                >
                  {t("titleLabel")}
                </Label>
                <Input
                  id="pageTitle"
                  placeholder={t("titlePlaceholder")}
                  value={dialogState.title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  aria-invalid={!!dialogState.error}
                  className={
                    "h-auto border-0 bg-transparent px-0 py-0.5 text-[1.4rem] font-semibold leading-tight tracking-tight text-sidebar-foreground shadow-none placeholder:text-sidebar-foreground/40 focus-visible:ring-0 md:!text-[1.4rem] dark:bg-transparent"
                  }
                />
              </div>
              <div>
                <Label
                  htmlFor="pageSlug"
                  className={
                    "mb-0.5 block text-[11px] font-medium tracking-wide text-sidebar-foreground/45"
                  }
                >
                  {t("slugLabel")}
                </Label>
                <Input
                  id="pageSlug"
                  placeholder={t("slugPlaceholder")}
                  value={slugValue}
                  onChange={(e) => {
                    setSlugLockedByUser(true);
                    setDialogState((current) => ({
                      ...current,
                      slug: e.target.value.toLowerCase(),
                      error: "",
                    }));
                  }}
                  aria-invalid={!!dialogState.error}
                  pattern={SLUG_PATTERN}
                  className={
                    "h-auto border-0 bg-transparent px-0 py-0.5 text-[0.95rem] leading-snug text-sidebar-foreground/80 shadow-none placeholder:text-sidebar-foreground/35 focus-visible:ring-0 md:!text-[0.95rem] dark:bg-transparent"
                  }
                />
              </div>
            </div>

            {dialogState.error ? (
              <p
                className={
                  "rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                }
              >
                {dialogState.error}
              </p>
            ) : null}
            <DialogFooter className="pt-0.5">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={dialogState.isSubmitting}
                className={
                  "h-8 rounded-full border-sidebar-border/70 bg-transparent px-3.5 text-sm"
                }
              >
                {tCommon("cancel")}
              </Button>
              <Button
                type="submit"
                disabled={dialogState.isSubmitting || !dialogState.title.trim()}
                className={"h-8 rounded-full px-4 text-sm"}
              >
                {dialogState.isSubmitting ? t("creating") : t("create")}
              </Button>
            </DialogFooter>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
