"use client";

import {
  ArrowDown01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  ArrowUp01Icon,
  Alert02Icon,
  Copy01Icon,
  ListTreeIcon,
  Layout01Icon,
  MoonIcon,
  RotateClockwiseIcon,
  Search01Icon,
  SourceCodeIcon,
  Sun01Icon,
  TextWrapIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { PresentationViewerControls } from "@baseblocks/anydoc/presentation";
import type {
  ViewerControls,
  ViewerSearchControls,
  ViewerZoomControls,
} from "@baseblocks/anydoc/react";
import type { SpreadsheetViewerControls } from "@baseblocks/anydoc/spreadsheet";
import { Button } from "@baseblocks/ui/button";
import { Input } from "@baseblocks/ui/input";
import { cn } from "@baseblocks/ui/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@baseblocks/ui/popover";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";

type PortalProps = {
  target: HTMLDivElement | null;
};

export function DocumentViewerControlsPortal({
  controls,
  target,
}: PortalProps & { controls: ViewerControls }) {
  if (!target) return null;
  return createPortal(<DocumentViewerControls controls={controls} />, target);
}

export function PresentationViewerControlsPortal({
  controls,
  target,
}: PortalProps & { controls: PresentationViewerControls }) {
  if (!target) return null;
  return createPortal(
    <PresentationViewerControlsView controls={controls} />,
    target,
  );
}

export function SpreadsheetViewerControlsPortal({
  controls,
  target,
}: PortalProps & { controls: SpreadsheetViewerControls }) {
  if (!target) return null;
  return createPortal(
    <SpreadsheetViewerControlsView controls={controls} />,
    target,
  );
}

function DocumentViewerControls({ controls }: { controls: ViewerControls }) {
  const t = useTranslations("libraries.viewer");
  return (
    <ToolbarCluster label={t("documentControls")}>
      {controls.pagination ? (
        <PageControls
          current={controls.pagination.current}
          next={controls.pagination.next}
          nextLabel={t("nextPage")}
          previous={controls.pagination.previous}
          previousLabel={t("previousPage")}
          total={controls.pagination.total}
        />
      ) : null}
      {controls.zoom ? <ZoomControls controls={controls.zoom} /> : null}
      {controls.actions.map((action) => (
        <ViewerActionButton action={action} key={action.id} />
      ))}
      {controls.search ? <SearchControl controls={controls.search} /> : null}
    </ToolbarCluster>
  );
}

function ViewerActionButton({
  action,
}: {
  action: ViewerControls["actions"][number];
}) {
  const t = useTranslations("libraries.viewer");
  const icon =
    action.id === "rotate"
      ? RotateClockwiseIcon
      : action.id === "layout"
        ? Layout01Icon
        : action.id === "mode"
          ? SourceCodeIcon
          : action.id === "outline"
            ? ListTreeIcon
            : action.id === "wrap"
              ? TextWrapIcon
              : null;
  const label =
    action.id === "rotate"
      ? t("rotateClockwise")
      : action.id === "layout"
        ? action.pressed
          ? t("continuousPages")
          : t("singlePage")
        : action.id === "mode"
          ? action.pressed
            ? t("showRendered")
            : t("showSource")
          : action.id === "outline"
            ? t("toggleOutline")
            : action.id === "wrap"
              ? t("wrapLines")
              : action.label;
  if (icon) {
    return (
      <IconButton
        disabled={action.disabled}
        label={label}
        onClick={action.run}
        pressed={action.pressed}
      >
        <HugeiconsIcon aria-hidden="true" className="size-4" icon={icon} />
      </IconButton>
    );
  }
  return (
    <Button
      aria-pressed={action.pressed}
      disabled={action.disabled}
      onClick={action.run}
      size="xs"
      type="button"
      variant="ghost"
    >
      {label}
    </Button>
  );
}

function PresentationViewerControlsView({
  controls,
}: {
  controls: PresentationViewerControls;
}) {
  const t = useTranslations("libraries.viewer");
  const search: ViewerSearchControls = {
    current: controls.searchIndex,
    next: controls.nextSearchResult,
    pending: false,
    previous: controls.previousSearchResult,
    query: controls.query,
    setQuery: controls.search,
    total: controls.searchResultCount,
  };
  const zoom: ViewerZoomControls = {
    max: 3,
    min: 0.25,
    reset: () => controls.zoomTo(1),
    set: controls.zoomTo,
    step: 0.1,
    value: controls.zoom,
    zoomIn: () => controls.zoomTo(controls.zoom + 0.1),
    zoomOut: () => controls.zoomTo(controls.zoom - 0.1),
  };
  return (
    <ToolbarCluster label={t("presentationControls")}>
      <PageControls
        current={controls.currentSlide}
        disabled={!controls.ready}
        next={controls.nextSlide}
        nextLabel={t("nextSlide")}
        previous={controls.previousSlide}
        previousLabel={t("previousSlide")}
        total={controls.slideCount}
      />
      <ZoomControls controls={zoom} disabled={!controls.ready} />
      <SearchControl controls={search} disabled={!controls.ready} />
      {controls.limitations > 0 ? (
        <span
          aria-label={t("presentationLimitations", {
            count: controls.limitations,
          })}
          className="inline-flex h-8 shrink-0 items-center gap-0.5 rounded-md px-1.5 text-xs tabular-nums text-amber-700 dark:text-amber-400"
          role="status"
          title={t("presentationLimitations", {
            count: controls.limitations,
          })}
        >
          <HugeiconsIcon
            aria-hidden="true"
            className="size-4"
            icon={Alert02Icon}
          />
          {controls.limitations}
        </span>
      ) : null}
    </ToolbarCluster>
  );
}

function SpreadsheetViewerControlsView({
  controls,
}: {
  controls: SpreadsheetViewerControls;
}) {
  const t = useTranslations("libraries.viewer");
  const search: ViewerSearchControls = {
    current: controls.searchResultIndex,
    next: controls.searchNext,
    pending: false,
    previous: controls.searchPrevious,
    query: controls.query,
    setQuery: controls.search,
    total: controls.searchResultCount,
  };
  const zoom: ViewerZoomControls = {
    max: 2,
    min: 0.5,
    reset: () => controls.zoomTo(1),
    set: controls.zoomTo,
    step: 0.1,
    value: controls.zoom,
    zoomIn: () => controls.zoomTo(controls.zoom + 0.1),
    zoomOut: () => controls.zoomTo(controls.zoom - 0.1),
  };
  const appearanceLabel =
    controls.appearance === "dark" ? t("useLightViewer") : t("useDarkViewer");
  return (
    <ToolbarCluster label={t("spreadsheetControls")}>
      <div
        aria-label={t("activeCell")}
        className="flex h-8 max-w-48 shrink-0 items-center gap-1 rounded-md px-1.5 text-xs"
        role="group"
      >
        <span className="min-w-10 font-mono text-muted-foreground">
          {controls.activeCell.address || "–"}
        </span>
        <span aria-hidden="true" className="text-muted-foreground">
          fx
        </span>
        <span
          aria-label={t("formulaBar")}
          className="min-w-10 truncate"
          title={controls.activeCell.value || undefined}
        >
          {controls.activeCell.value}
        </span>
      </div>
      <ZoomControls controls={zoom} />
      <SearchControl controls={search} />
      <IconButton label={t("copySelection")} onClick={controls.copySelection}>
        <HugeiconsIcon
          aria-hidden="true"
          className="size-4"
          icon={Copy01Icon}
        />
      </IconButton>
      <IconButton label={appearanceLabel} onClick={controls.switchAppearance}>
        <HugeiconsIcon
          aria-hidden="true"
          className="size-4"
          icon={controls.appearance === "dark" ? Sun01Icon : MoonIcon}
        />
      </IconButton>
    </ToolbarCluster>
  );
}

function ToolbarCluster({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <div
      aria-label={label}
      className="flex min-w-0 items-center gap-1"
      role="group"
    >
      {children}
    </div>
  );
}

function PageControls({
  current,
  disabled = false,
  next,
  nextLabel,
  previous,
  previousLabel,
  total,
}: {
  current: number;
  disabled?: boolean;
  next: () => void;
  nextLabel: string;
  previous: () => void;
  previousLabel: string;
  total: number;
}) {
  return (
    <div className="flex items-center" role="group">
      <IconButton
        disabled={disabled || current <= 1}
        label={previousLabel}
        onClick={previous}
      >
        <HugeiconsIcon
          aria-hidden="true"
          className="size-4"
          icon={ArrowLeft01Icon}
        />
      </IconButton>
      <span
        aria-live="polite"
        className="min-w-12 text-center text-xs tabular-nums text-muted-foreground"
      >
        {current || "–"} / {total || "–"}
      </span>
      <IconButton
        disabled={disabled || total === 0 || current >= total}
        label={nextLabel}
        onClick={next}
      >
        <HugeiconsIcon
          aria-hidden="true"
          className="size-4"
          icon={ArrowRight01Icon}
        />
      </IconButton>
    </div>
  );
}

function ZoomControls({
  controls,
  disabled = false,
}: {
  controls: ViewerZoomControls;
  disabled?: boolean;
}) {
  const t = useTranslations("libraries.viewer");
  return (
    <div
      className="flex items-center"
      role="group"
      aria-label={t("zoomControls")}
    >
      <IconButton
        disabled={disabled || controls.value <= controls.min}
        label={t("zoomOut")}
        onClick={controls.zoomOut}
      >
        <span aria-hidden="true" className="text-base leading-none">
          −
        </span>
      </IconButton>
      <Button
        aria-label={t("resetZoom")}
        className="h-8 min-w-12 px-1.5 text-xs tabular-nums text-muted-foreground"
        disabled={disabled}
        onClick={controls.reset}
        size="xs"
        title={t("resetZoom")}
        type="button"
        variant="ghost"
      >
        {Math.round(controls.value * 100)}%
      </Button>
      <IconButton
        disabled={disabled || controls.value >= controls.max}
        label={t("zoomIn")}
        onClick={controls.zoomIn}
      >
        <span aria-hidden="true" className="text-base leading-none">
          +
        </span>
      </IconButton>
    </div>
  );
}

function SearchControl({
  controls,
  disabled = false,
}: {
  controls: ViewerSearchControls;
  disabled?: boolean;
}) {
  const t = useTranslations("libraries.viewer");
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          aria-label={t("searchDocument")}
          className="relative text-muted-foreground"
          disabled={disabled}
          size="icon-sm"
          title={t("searchDocument")}
          type="button"
          variant="ghost"
        >
          <HugeiconsIcon
            aria-hidden="true"
            className="size-4"
            icon={Search01Icon}
          />
          {controls.query ? (
            <span className="absolute right-1 top-1 size-1.5 rounded-full bg-primary" />
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-2" sideOffset={8}>
        <div className="flex items-center gap-1" role="search">
          <Input
            aria-label={t("searchDocument")}
            className="h-8 min-w-0 flex-1"
            onChange={(event) => controls.setQuery(event.currentTarget.value)}
            placeholder={t("searchDocument")}
            type="search"
            value={controls.query}
          />
          <IconButton
            disabled={controls.total === 0}
            label={t("previousResult")}
            onClick={controls.previous}
          >
            <HugeiconsIcon
              aria-hidden="true"
              className="size-4"
              icon={ArrowUp01Icon}
            />
          </IconButton>
          <IconButton
            disabled={controls.total === 0}
            label={t("nextResult")}
            onClick={controls.next}
          >
            <HugeiconsIcon
              aria-hidden="true"
              className="size-4"
              icon={ArrowDown01Icon}
            />
          </IconButton>
        </div>
        <div
          aria-live="polite"
          className="mt-1 min-h-4 px-1 text-xs text-muted-foreground"
          role="status"
        >
          {controls.pending
            ? t("searchingDocument")
            : controls.query
              ? t("searchResultCount", {
                  current: controls.current,
                  total: controls.total,
                })
              : ""}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function IconButton({
  children,
  disabled,
  label,
  onClick,
  pressed,
}: {
  children: ReactNode;
  disabled?: boolean;
  label: string;
  onClick: () => void;
  pressed?: boolean;
}) {
  return (
    <Button
      aria-label={label}
      aria-pressed={pressed}
      className={cn(
        "text-muted-foreground",
        pressed && "bg-primary/10 text-primary",
      )}
      disabled={disabled}
      onClick={onClick}
      size="icon-sm"
      title={label}
      type="button"
      variant="ghost"
    >
      {children}
    </Button>
  );
}
