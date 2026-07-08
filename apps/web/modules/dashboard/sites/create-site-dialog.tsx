"use client";

import { useHaptic } from "@/lib/use-haptic";
import { SLUG_PATTERN, generateSlug } from "@/lib/validation";
import { api } from "@baseblocks/backend";
import type { Id } from "@baseblocks/backend";
import { Button } from "@baseblocks/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@baseblocks/ui/dialog";
import { Input } from "@baseblocks/ui/input";
import { Label } from "@baseblocks/ui/label";
import { cn } from "@baseblocks/ui/lib/utils";
import { nestedCardRadiusClass } from "@baseblocks/ui/nested-card";
import { useMutation } from "convex/react";
import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { type FormEvent, useReducer, useState } from "react";

interface CreateSiteDialogProps {
  disabled?: boolean;
  teamId: Id<"teams">;
}

interface CreateSiteFormState {
  name: string;
  slug: string;
  error: string;
  isSubmitting: boolean;
  isSlugCustomized: boolean;
}

type CreateSiteFormAction =
  | { type: "reset" }
  | { type: "nameChanged"; value: string }
  | { type: "slugChanged"; value: string }
  | { type: "errorChanged"; value: string }
  | { type: "submitStarted" }
  | { type: "submitFinished" };

const slugRegex = new RegExp(`^${SLUG_PATTERN}$`);

const initialFormState: CreateSiteFormState = {
  name: "",
  slug: "",
  error: "",
  isSubmitting: false,
  isSlugCustomized: false,
};

function createSiteFormReducer(
  state: CreateSiteFormState,
  action: CreateSiteFormAction,
): CreateSiteFormState {
  switch (action.type) {
    case "reset":
      return initialFormState;
    case "nameChanged":
      return {
        ...state,
        name: action.value,
        slug: state.isSlugCustomized ? state.slug : generateSlug(action.value),
        error: "",
      };
    case "slugChanged":
      return {
        ...state,
        slug: action.value.toLowerCase(),
        isSlugCustomized: true,
        error: "",
      };
    case "errorChanged":
      return {
        ...state,
        error: action.value,
      };
    case "submitStarted":
      return {
        ...state,
        error: "",
        isSubmitting: true,
      };
    case "submitFinished":
      return {
        ...state,
        isSubmitting: false,
      };
    default:
      return state;
  }
}

export function CreateSiteDialog({
  disabled = false,
  teamId,
}: CreateSiteDialogProps) {
  const t = useTranslations();
  const haptic = useHaptic();
  const [open, setOpen] = useState(false);
  const [formState, dispatch] = useReducer(
    createSiteFormReducer,
    initialFormState,
  );

  const createSite = useMutation(api.sites.mutations.create);

  // Failure modes:
  // - Site name is empty
  // - Slug is empty or invalid
  // - Site creation mutation rejects
  const resetForm = () => {
    dispatch({ type: "reset" });
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);

    if (!nextOpen) {
      resetForm();
      return;
    }

    dispatch({ type: "errorChanged", value: "" });
  };

  const handleNameChange = (value: string) => {
    dispatch({ type: "nameChanged", value });
  };

  const handleSlugChange = (value: string) => {
    dispatch({ type: "slugChanged", value });
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmedName = formState.name.trim();
    const trimmedSlug = formState.slug.trim();

    if (!trimmedName) {
      dispatch({
        type: "errorChanged",
        value: t("dialogs.createSite.nameRequired"),
      });
      return;
    }

    if (!trimmedSlug) {
      dispatch({
        type: "errorChanged",
        value: t("dialogs.createSite.slugRequired"),
      });
      return;
    }

    if (!slugRegex.test(trimmedSlug)) {
      dispatch({
        type: "errorChanged",
        value: t("dialogs.createSite.slugHint"),
      });
      return;
    }

    dispatch({ type: "submitStarted" });

    try {
      await createSite({
        name: trimmedName,
        slug: trimmedSlug,
        teamId,
      });
      haptic.trigger("success");
      setOpen(false);
      resetForm();
    } catch (err) {
      haptic.trigger("error");
      dispatch({
        type: "errorChanged",
        value: err instanceof Error ? err.message : t("common.error"),
      });
      dispatch({ type: "submitFinished" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <button
          className={cn(
            nestedCardRadiusClass,
            "group relative flex min-h-[13rem] w-full flex-col items-center justify-center gap-3 overflow-hidden border-2 border-dashed border-muted-foreground/35 bg-transparent text-muted-foreground transition-[transform,border-color,background-color,color,box-shadow] duration-200 ease-out",
            "hover:-translate-y-0.5 hover:border-primary/28 hover:bg-accent/14 hover:text-foreground hover:shadow-[0_10px_28px_hsl(var(--primary)/0.08)]",
            "focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
            "active:scale-[0.98]",
            "disabled:pointer-events-none disabled:opacity-50",
          )}
          disabled={disabled}
          type="button"
        >
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-primary/[0.018] via-transparent to-transparent opacity-0 transition-opacity duration-200 ease-out group-hover:opacity-100" />
          <span className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-border/60 bg-card shadow-[inset_0_1px_0_hsl(var(--background)/0.5)] transition-colors duration-200 ease-out group-hover:border-primary/25 group-hover:bg-background">
            <Plus className="h-4 w-4 shrink-0" />
          </span>
          <span className="relative flex items-center gap-2 font-medium">
            {t("dashboard.createSite")}
          </span>
        </button>
      </DialogTrigger>
      <DialogContent
        className={
          "overflow-hidden rounded-[1.5rem] border-sidebar-border bg-sidebar p-0 text-sidebar-foreground shadow-2xl sm:max-w-[46rem] [&_[data-slot='dialog-close']]:top-4 [&_[data-slot='dialog-close']]:right-4"
        }
      >
        <DialogHeader className={"px-5 pt-4 pb-0"}>
          <DialogTitle className={"text-base font-semibold"}>
            {t("dialogs.createSite.title")}
          </DialogTitle>
        </DialogHeader>
        <form noValidate onSubmit={handleSubmit} className={"px-5 pb-3"}>
          <div className="space-y-2">
            <div className="space-y-2.5">
              <div>
                <Label
                  htmlFor="siteName"
                  className={
                    "mb-0.5 block text-xs font-medium tracking-wide text-sidebar-foreground/55"
                  }
                >
                  {t("dialogs.createSite.nameLabel")}
                </Label>
                <Input
                  id="siteName"
                  placeholder={t("dialogs.createSite.namePlaceholder")}
                  value={formState.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  aria-invalid={!!formState.error}
                  className={
                    "h-auto border-0 bg-transparent px-0 py-0.5 text-[1.4rem] font-semibold leading-tight tracking-tight text-sidebar-foreground shadow-none placeholder:text-sidebar-foreground/40 focus-visible:ring-0 md:!text-[1.4rem] dark:bg-transparent"
                  }
                />
              </div>
              <div>
                <Label
                  htmlFor="siteSlug"
                  className={
                    "mb-0.5 block text-[11px] font-medium tracking-wide text-sidebar-foreground/45"
                  }
                >
                  {t("dialogs.createSite.slugLabel")}
                </Label>
                <Input
                  id="siteSlug"
                  placeholder={t("dialogs.createSite.slugPlaceholder")}
                  value={formState.slug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  aria-invalid={!!formState.error}
                  className={
                    "h-auto border-0 bg-transparent px-0 py-0.5 text-[0.95rem] leading-snug text-sidebar-foreground/80 shadow-none placeholder:text-sidebar-foreground/35 focus-visible:ring-0 md:!text-[0.95rem] dark:bg-transparent"
                  }
                />
              </div>
            </div>

            {formState.error ? (
              <p
                className={
                  "rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                }
              >
                {formState.error}
              </p>
            ) : null}
            <DialogFooter className="pt-0.5">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={formState.isSubmitting}
                className={
                  "h-8 rounded-full border-sidebar-border/70 bg-transparent px-3.5 text-sm"
                }
              >
                {t("common.cancel")}
              </Button>
              <Button
                type="submit"
                disabled={formState.isSubmitting}
                className={"h-8 rounded-full px-4 text-sm"}
              >
                {formState.isSubmitting
                  ? t("dialogs.createSite.creating")
                  : t("dialogs.createSite.create")}
              </Button>
            </DialogFooter>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
