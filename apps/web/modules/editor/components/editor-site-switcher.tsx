"use client";

import { Link } from "@/i18n/navigation";
import { useTeamSites } from "@/lib/data/use-site";
import { getTeamSiteEditorPath } from "@/lib/routes/team-routes";
import { cn } from "@/lib/utils";
import {
  type EditorSiteSwitcherSite,
  getEditorSiteSwitcherSites,
} from "@/modules/editor/lib/editor-site-switcher";
import { useTeamAccess } from "@/modules/team/team-access";
import { Button } from "@baseblocks/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@baseblocks/ui/dropdown-menu";
import { Check, ChevronDown } from "lucide-react";
import Image from "next/image";

interface EditorSiteSwitcherProps {
  currentSiteId: string;
  currentSiteLogoUrl?: string;
  currentSiteName: string;
  teamSlug: string;
}

// Failure modes:
// - Team site list is still loading, so the header falls back to the current site only.
// - The current site is missing from the returned list, so menu ordering falls back to alphabetical.
// - Only one accessible site exists, so the dropdown is suppressed to avoid dead-end chrome.
function SiteAvatar({
  logoUrl,
  name,
  sizeClassName,
}: {
  logoUrl?: string;
  name: string;
  sizeClassName: string;
}) {
  if (logoUrl) {
    return (
      <Image
        src={logoUrl}
        alt={name}
        className={cn(
          "rounded-[0.625rem] object-contain outline outline-1 -outline-offset-1 outline-black/5 dark:outline-white/10",
          sizeClassName,
        )}
        width={40}
        height={40}
        unoptimized
      />
    );
  }

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-[0.625rem] bg-primary font-semibold text-primary-foreground",
        sizeClassName,
      )}
    >
      {name[0]?.toUpperCase() ?? "S"}
    </div>
  );
}

function CurrentSiteButton({
  name,
  logoUrl,
  showChevron,
}: {
  name: string;
  logoUrl?: string;
  showChevron: boolean;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <div className="rounded-[0.6875rem] bg-background/80 p-px shadow-[inset_0_1px_0_hsl(var(--background)/0.65)] ring-1 ring-border/60">
        <SiteAvatar logoUrl={logoUrl} name={name} sizeClassName="h-7 w-7" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium leading-none">{name}</p>
      </div>
      {showChevron ? (
        <ChevronDown className="ml-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/80" />
      ) : null}
    </div>
  );
}

function SiteMenuItem({
  site,
}: {
  site: EditorSiteSwitcherSite;
}) {
  return (
    <div className="flex w-full min-w-0 items-start gap-2">
      <div className="rounded-[0.75rem] bg-muted/55 p-px shadow-[inset_0_1px_0_hsl(var(--background)/0.45)] ring-1 ring-border/60">
        <SiteAvatar
          logoUrl={site.logoUrl}
          name={site.name}
          sizeClassName="h-8 w-8"
        />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate font-medium leading-none">{site.name}</span>
        </div>
        <div className="flex items-center gap-1.5 pt-0.5">
          <span className="truncate font-mono text-[11px] text-muted-foreground/85">
            /{site.slug}
          </span>
          <span
            className={cn(
              "h-1.5 w-1.5 shrink-0 rounded-full",
              site.isPublished
                ? "bg-emerald-500 dark:bg-emerald-400"
                : "bg-amber-500 dark:bg-amber-300",
            )}
          />
        </div>
      </div>
    </div>
  );
}

export function EditorSiteSwitcher({
  currentSiteId,
  currentSiteLogoUrl,
  currentSiteName,
  teamSlug,
}: EditorSiteSwitcherProps) {
  const { team } = useTeamAccess();
  const sites = useTeamSites(team._id);
  const switcherSites = getEditorSiteSwitcherSites(sites ?? [], currentSiteId);
  const hasOtherSites = switcherSites.length > 1;

  if (!hasOtherSites) {
    return (
      <CurrentSiteButton
        name={currentSiteName}
        logoUrl={currentSiteLogoUrl}
        showChevron={false}
      />
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-9 min-w-0 rounded-[0.875rem] px-2 text-left shadow-[inset_0_1px_0_hsl(var(--background)/0.45)] transition-[background-color,box-shadow] duration-150 ease-out hover:bg-background/85 hover:shadow-[0_10px_24px_hsl(var(--foreground)/0.06)]"
        >
          <CurrentSiteButton
            name={currentSiteName}
            logoUrl={currentSiteLogoUrl}
            showChevron
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-[17.5rem] rounded-[1.125rem] border-border/70 p-1 shadow-[0_20px_48px_hsl(var(--foreground)/0.12)]"
        sideOffset={8}
      >
        {switcherSites.map((site, index) => {
          const isCurrent = site._id === currentSiteId;

          if (isCurrent) {
            return (
              <DropdownMenuItem
                key={site._id}
                className={cn(
                  "rounded-[0.875rem] bg-accent/30 px-2 py-2 focus:bg-accent/50",
                  index > 0 && "mt-1",
                )}
                onSelect={(event) => event.preventDefault()}
              >
                <SiteMenuItem site={site} />
                <div className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary shadow-sm">
                  <Check className="size-3 text-primary-foreground" />
                </div>
              </DropdownMenuItem>
            );
          }

          return (
            <DropdownMenuItem
              key={site._id}
              asChild
              className={cn(
                "rounded-[0.875rem] px-2 py-2",
                index > 0 && "mt-1",
              )}
            >
              <Link href={getTeamSiteEditorPath(teamSlug, site._id)}>
                <SiteMenuItem site={site} />
              </Link>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
