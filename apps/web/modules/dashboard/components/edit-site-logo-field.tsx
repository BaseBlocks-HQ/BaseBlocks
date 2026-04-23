"use client";

import { Button } from "@baseblocks/ui/button";
import { Label } from "@baseblocks/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@baseblocks/ui/tooltip";
import { ImagePlus, Info, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import type { ChangeEvent, RefObject } from "react";

interface EditSiteLogoFieldProps {
  fileInputRef: RefObject<HTMLInputElement | null>;
  isUploading: boolean;
  logoPreview: string;
  onLogoUpload: (e: ChangeEvent<HTMLInputElement>) => void;
  onRemoveLogo: () => void;
}

export function EditSiteLogoField({
  fileInputRef,
  isUploading,
  logoPreview,
  onLogoUpload,
  onRemoveLogo,
}: EditSiteLogoFieldProps) {
  const t = useTranslations();

  return (
    <div className="rounded-[1.1rem] border border-sidebar-border/80 bg-background/55 p-3 shadow-[inset_0_1px_0_hsl(var(--background)/0.4)]">
      <div className="mb-3 flex items-center gap-2">
        <div className="flex items-center gap-1.5">
          <Label className="text-xs font-medium tracking-wide text-sidebar-foreground/55">
            {t("dialogs.editSite.logoLabel")}
          </Label>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="inline-flex h-4 w-4 items-center justify-center rounded-full text-sidebar-foreground/40 transition-colors hover:text-sidebar-foreground/65 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar"
              >
                <Info className="h-3 w-3" />
                <span className="sr-only">
                  {t("dialogs.editSite.logoHint")}
                </span>
              </button>
            </TooltipTrigger>
            <TooltipContent
              side="top"
              sideOffset={6}
              className="max-w-[220px] bg-sidebar text-sidebar-foreground shadow-lg"
              arrowClassName="bg-sidebar fill-sidebar"
            >
              {t("dialogs.editSite.logoHint")}
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {logoPreview ? (
          <div className="relative shrink-0 rounded-[1rem] bg-muted/45 p-0.5 shadow-[inset_0_1px_0_hsl(var(--background)/0.45)] ring-1 ring-border/60">
            <Image
              src={logoPreview}
              alt="Site logo"
              className="h-16 w-16 rounded-[0.85rem] border border-border/55 bg-background object-contain"
              width={64}
              height={64}
              unoptimized
            />
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute -top-1.5 -right-1.5 h-7 w-7 rounded-full shadow-sm"
              onClick={onRemoveLogo}
              disabled={isUploading}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : (
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[1rem] border border-dashed border-sidebar-border/80 bg-background/70 text-sidebar-foreground/45">
            <ImagePlus className="h-6 w-6" />
          </div>
        )}

        <div className="min-w-0 flex-1">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={onLogoUpload}
            className="hidden"
            disabled={isUploading}
          />
          <p className="text-sm font-medium text-sidebar-foreground">
            {logoPreview
              ? t("dialogs.editSite.logoSelected")
              : t("dialogs.editSite.logoEmpty")}
          </p>
          <div className="mt-1 flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="h-auto rounded-none px-0 py-0 text-sm font-medium text-sidebar-foreground/70 hover:bg-transparent hover:text-sidebar-foreground"
            >
              {t("dialogs.editSite.uploadLogo")}
            </Button>
            {isUploading ? (
              <span className="inline-flex items-center gap-1.5 text-xs text-sidebar-foreground/50">
                <span className="h-1.5 w-1.5 rounded-full bg-sidebar-foreground/35" />
                {t("dialogs.editSite.uploading")}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
