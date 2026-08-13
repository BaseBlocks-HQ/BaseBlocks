"use client";

import { useEditorWorkspace } from "@/features/editor/editor-state";
import { api, type Id } from "@baseblocks/backend";
import {
  DEFAULT_SITE_SIDEBAR_VARIANT,
  DEFAULT_SITE_THEME,
} from "@baseblocks/domain";
import { Button } from "@baseblocks/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@baseblocks/ui/dialog";
import { cn } from "@baseblocks/ui/lib/utils";
import { Spinner } from "@baseblocks/ui/spinner";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@baseblocks/ui/tooltip";
import {
  ArrowReloadHorizontalIcon,
  ColorPickerIcon,
  IdentityCardIcon,
  SidebarLeftIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useMutation } from "convex/react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { SiteAppearanceSettings } from "./settings/site-appearance-settings";
import { SiteBrandSettings } from "./settings/site-brand-settings";
import { SiteNavigationSettings } from "./settings/site-navigation-settings";

interface SiteSettingsDialogProps {
  onOpenChange: (open: boolean) => void;
  returnFocusTo?: HTMLElement | null;
  siteId: Id<"sites">;
}

type SiteSettingsSection = "brand" | "appearance" | "navigation";

const SECTIONS = [
  {
    id: "brand" as const,
    icon: IdentityCardIcon,
    label: "Brand",
  },
  {
    id: "appearance" as const,
    icon: ColorPickerIcon,
    label: "Appearance",
  },
  {
    id: "navigation" as const,
    icon: SidebarLeftIcon,
    label: "Navigation",
  },
];

export function SiteSettingsDialog({
  onOpenChange,
  returnFocusTo,
  siteId,
}: SiteSettingsDialogProps) {
  const { site: workspaceSite } = useEditorWorkspace();
  const site = workspaceSite?._id === siteId ? workspaceSite : null;
  const updateSite = useMutation(api.sites.update);
  const sectionTitleRef = useRef<HTMLHeadingElement>(null);
  const [section, setSection] = useState<SiteSettingsSection>("brand");
  const [isResettingAppearance, setIsResettingAppearance] = useState(false);
  const activeSection = SECTIONS.find((item) => item.id === section)!;

  const resetAppearance = async () => {
    setIsResettingAppearance(true);
    try {
      await updateSite({
        siteId,
        settings: {
          sidebarVariant: DEFAULT_SITE_SIDEBAR_VARIANT,
          theme: DEFAULT_SITE_THEME,
        },
      });
    } catch {
      toast.error("Unable to reset the appearance. Try again.");
    } finally {
      setIsResettingAppearance(false);
    }
  };

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent
        className="h-[min(88vh,40rem)] w-[calc(100%-1.5rem)] max-w-[52rem] grid-rows-[minmax(0,1fr)] gap-0 overflow-hidden rounded-2xl border-0 bg-background/70 p-0 text-foreground shadow-2xl backdrop-blur-xl backdrop-saturate-150 sm:max-w-[52rem] [&_[data-slot='dialog-close']]:top-2 [&_[data-slot='dialog-close']]:right-2 [&_[data-slot='dialog-close']]:flex [&_[data-slot='dialog-close']]:size-8 [&_[data-slot='dialog-close']]:items-center [&_[data-slot='dialog-close']]:justify-center [&_[data-slot='dialog-close']]:rounded-lg"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          sectionTitleRef.current?.focus();
        }}
        returnFocusTo={returnFocusTo}
      >
        <DialogDescription className="sr-only">
          Configure the site brand, appearance, and navigation.
        </DialogDescription>
        <DialogTitle className="sr-only">Site settings</DialogTitle>
        <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)] grid-rows-[auto_minmax(0,1fr)] md:grid-cols-[11rem_minmax(0,1fr)] md:grid-rows-1">
          <aside className="bg-sidebar/35 p-2 pe-12 md:pe-2">
            <nav
              aria-label="Site settings sections"
              className="flex gap-1 md:flex-col"
            >
              {SECTIONS.map((item) => (
                <button
                  aria-current={section === item.id ? "page" : undefined}
                  className={cn(
                    "flex h-8 min-w-0 flex-1 items-center justify-center gap-2 rounded-lg px-1.5 text-xs outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/50 sm:flex-none sm:px-2.5 sm:text-sm md:w-full md:flex-auto md:justify-start",
                    section === item.id
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                  )}
                  key={item.id}
                  onClick={() => setSection(item.id)}
                  type="button"
                >
                  <HugeiconsIcon
                    aria-hidden
                    className="hidden size-4 sm:block"
                    icon={item.icon}
                  />
                  {item.label}
                </button>
              ))}
            </nav>
          </aside>

          <main className="min-h-0 min-w-0 overflow-y-auto overscroll-contain px-5 pb-6 sm:px-6">
            {!site ? (
              <div className="flex min-h-full items-center justify-center">
                <Spinner className="size-5 text-muted-foreground" />
                <span className="sr-only">Loading site settings</span>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex min-h-12 items-center justify-between gap-3 pe-8">
                  <h3
                    className="brand-display text-2xl leading-none font-normal tracking-[-0.025em] focus:outline-none"
                    ref={sectionTitleRef}
                    tabIndex={-1}
                  >
                    {activeSection.label}
                  </h3>
                  {section === "appearance" ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          aria-label="Reset appearance"
                          disabled={isResettingAppearance}
                          onClick={() => void resetAppearance()}
                          size="icon-sm"
                          variant="ghost"
                        >
                          {isResettingAppearance ? (
                            <Spinner className="size-3.5" />
                          ) : (
                            <HugeiconsIcon
                              aria-hidden
                              className="size-4"
                              icon={ArrowReloadHorizontalIcon}
                            />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent sideOffset={6}>
                        Reset appearance
                      </TooltipContent>
                    </Tooltip>
                  ) : null}
                </div>

                {section === "brand" ? (
                  <SiteBrandSettings site={site} />
                ) : section === "appearance" ? (
                  <SiteAppearanceSettings
                    sidebarVariant={site.settings.sidebarVariant}
                    siteId={siteId}
                    theme={site.settings.theme}
                  />
                ) : (
                  <SiteNavigationSettings site={site} />
                )}
              </div>
            )}
          </main>
        </div>
      </DialogContent>
    </Dialog>
  );
}
