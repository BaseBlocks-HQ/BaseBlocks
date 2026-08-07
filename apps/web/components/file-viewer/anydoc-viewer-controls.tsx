"use client";

import {
  ArrowDown01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  ArrowUp01Icon,
  Copy01Icon,
  Layout01Icon,
  ListTreeIcon,
  MoonIcon,
  RotateClockwiseIcon,
  Search01Icon,
  SourceCodeIcon,
  Sun01Icon,
  TextWrapIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type {
  ViewerControls,
  ViewerSearchControls,
  ViewerZoomControls,
} from "@baseblocks/anydoc/react";
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

export function UnifiedViewerControls({
  controls,
}: {
  controls: ViewerControls;
}) {
  const t = useTranslations("libraries.viewer");
  const presentation = controls.format === "pptx";
  return (
    <div
      aria-label={
        presentation ? t("presentationControls") : t("documentControls")
      }
      className="flex min-w-0 items-center gap-1"
      role="group"
    >
      {controls.pagination ? (
        <PageControls
          current={controls.pagination.current}
          next={controls.pagination.next}
          nextLabel={t(presentation ? "nextSlide" : "nextPage")}
          previous={controls.pagination.previous}
          previousLabel={t(presentation ? "previousSlide" : "previousPage")}
          total={controls.pagination.total}
        />
      ) : null}
      {controls.zoom ? <ZoomControls controls={controls.zoom} /> : null}
      {controls.actions
        .filter((action) => action.id !== "rotate" && action.id !== "layout")
        .map((action) => (
          <ViewerActionButton action={action} key={action.id} />
        ))}
      {controls.search ? <SearchControl controls={controls.search} /> : null}
    </div>
  );
}

function ViewerActionButton({
  action,
}: {
  action: ViewerControls["actions"][number];
}) {
  const t = useTranslations("libraries.viewer");
  const appearance = action.id === "appearance";
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
              : action.id === "copy"
                ? Copy01Icon
                : appearance
                  ? action.pressed
                    ? Sun01Icon
                    : MoonIcon
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
              : action.id === "copy"
                ? t("copySelection")
                : appearance
                  ? action.pressed
                    ? t("useLightViewer")
                    : t("useDarkViewer")
                  : action.label;
  if (!icon) {
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

function PageControls({
  current,
  next,
  nextLabel,
  previous,
  previousLabel,
  total,
}: {
  current: number;
  next: () => void;
  nextLabel: string;
  previous: () => void;
  previousLabel: string;
  total: number;
}) {
  return (
    <div className="flex items-center" role="group">
      <IconButton
        disabled={current <= 1}
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
        disabled={total === 0 || current >= total}
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

function ZoomControls({ controls }: { controls: ViewerZoomControls }) {
  const t = useTranslations("libraries.viewer");
  return (
    <div
      aria-label={t("zoomControls")}
      className="flex items-center"
      role="group"
    >
      <IconButton
        disabled={controls.value <= controls.min}
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
        onClick={controls.reset}
        size="xs"
        title={t("resetZoom")}
        type="button"
        variant="ghost"
      >
        {Math.round(controls.value * 100)}%
      </Button>
      <IconButton
        disabled={controls.value >= controls.max}
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

function SearchControl({ controls }: { controls: ViewerSearchControls }) {
  const t = useTranslations("libraries.viewer");
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          aria-label={t("searchDocument")}
          className="relative text-muted-foreground"
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
