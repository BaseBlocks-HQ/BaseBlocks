"use client";

import { BlurStack } from "@baseblocks/ui/blur-stack";
import { getStoredAccessSessionTokens } from "@/modules/public-site/access-session";
import { ToolbarButton } from "@/modules/file-preview";
import { usePagePanelState } from "@/modules/site-runtime/page-panel-state";
import { api } from "@baseblocks/backend";
import type { Id } from "@baseblocks/backend";
import { useQuery } from "convex/react";
import { Maximize2, Minimize2, X } from "lucide-react";
import { type ReactNode, type SVGProps, useId } from "react";
import { PublicPageContent } from "./page-content";

interface PublicPagePanelProps {
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

function PublicPagePanelFrame({
  header,
  children,
}: {
  header: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="relative flex h-full min-h-0 min-w-0 flex-col">
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10">
        <div className="pointer-events-auto">{header}</div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="min-h-full px-3 pb-3 pt-14 md:px-4 md:pb-4">
          {children}
        </div>
      </div>
    </div>
  );
}

function PublicPagePanelHeader({ children }: { children: ReactNode }) {
  return (
    <div className="relative isolate overflow-hidden">
      <BlurStack className="inset-x-0 top-0 h-14" direction="down" />
      <div className="absolute inset-0 bg-linear-to-b from-background/78 via-background/42 to-background/8 dark:from-background/86 dark:via-background/52 dark:to-background/12" />
      <div className="relative">{children}</div>
    </div>
  );
}

function downloadPageExport(pageId: string) {
  window.location.assign(`/api/pages/${pageId}/export?format=docx`);
}

export function PublicPagePanel({
  isFullscreen,
  onToggleFullscreen,
}: PublicPagePanelProps) {
  const { closePage, viewingPage } = usePagePanelState();
  const sessionTokens = getStoredAccessSessionTokens();
  const page = useQuery(
    api.pages.get,
    viewingPage?.pageId
      ? { pageId: viewingPage.pageId as Id<"pages">, sessionTokens }
      : "skip",
  );

  if (!viewingPage) {
    return null;
  }

  return (
    <PublicPagePanelFrame
      header={
        <PublicPagePanelHeader>
          <div className="flex h-14 items-center justify-between gap-3 px-4">
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-sm font-medium leading-tight">
                {page?.title ?? "Loading..."}
              </h2>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <ToolbarButton
                onClick={() => downloadPageExport(viewingPage.pageId)}
                label="Export as Word"
              >
                <WordLogoIcon className="h-4 w-4" />
              </ToolbarButton>
              {onToggleFullscreen ? (
                <ToolbarButton
                  onClick={onToggleFullscreen}
                  label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
                  pressed={isFullscreen}
                >
                  {isFullscreen ? (
                    <Minimize2 className="h-4 w-4" />
                  ) : (
                    <Maximize2 className="h-4 w-4" />
                  )}
                </ToolbarButton>
              ) : null}
              <ToolbarButton onClick={closePage} label="Close panel">
                <X className="h-4 w-4" />
              </ToolbarButton>
            </div>
          </div>
        </PublicPagePanelHeader>
      }
    >
      <PublicPageContent nested pageId={viewingPage.pageId} />
    </PublicPagePanelFrame>
  );
}

function WordLogoIcon(props: SVGProps<SVGSVGElement>) {
  const baseId = useId().replaceAll(":", "");
  const gradientIdA = `${baseId}-microsoft_word-a`;
  const gradientIdB = `${baseId}-microsoft_word-b`;
  const gradientIdC = `${baseId}-microsoft_word-c`;
  const gradientIdD = `${baseId}-microsoft_word-d`;
  const gradientIdE = `${baseId}-microsoft_word-e`;
  const gradientIdF = `${baseId}-microsoft_word-f`;
  const gradientIdG = `${baseId}-microsoft_word-g`;
  const gradientIdH = `${baseId}-microsoft_word-h`;

  return (
    <svg viewBox="0 0 486 500" aria-hidden="true" {...props}>
      <defs>
        <radialGradient
          id={gradientIdA}
          cx="-689.34"
          cy="753.93"
          r="13.89"
          fx="-689.34"
          fy="753.93"
          gradientTransform="matrix(47.56 0 0 -20.15 33260.63 15691.18)"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset=".18" stopColor="#1657f4" />
          <stop offset=".57" stopColor="#0036c4" />
        </radialGradient>
        <radialGradient
          id={gradientIdC}
          cx="-730.97"
          cy="806.4"
          r="13.89"
          fx="-730.97"
          fy="806.4"
          gradientTransform="matrix(-20.22495 21.28288 52.40647 49.82267 -56559.12 -24498.36)"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset=".14" stopColor="#d471ff" />
          <stop offset=".83" stopColor="#509df5" stopOpacity="0" />
        </radialGradient>
        <radialGradient
          id={gradientIdD}
          cx="-682.21"
          cy="801.86"
          r="13.89"
          fx="-682.21"
          fy="801.86"
          gradientTransform="matrix(0 18.62 101.62 0 -81063.08 13022.32)"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset=".28" stopColor="#4f006f" stopOpacity="0" />
          <stop offset="1" stopColor="#4f006f" />
        </radialGradient>
        <radialGradient
          id={gradientIdF}
          cx="-749.58"
          cy="798.74"
          r="13.89"
          fx="-749.58"
          fy="798.74"
          gradientTransform="matrix(-28.7167 6.70901 16.06567 68.78884 -33867.69 -49911.37)"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset=".06" stopColor="#e4a7fe" />
          <stop offset=".54" stopColor="#e4a7fe" stopOpacity="0" />
        </radialGradient>
        <radialGradient
          id={gradientIdG}
          cx="-675.64"
          cy="797.48"
          r="13.89"
          fx="-675.64"
          fy="797.48"
          gradientTransform="matrix(15.99196 15.99755 15.99476 -15.99476 -1949 23805.98)"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset=".08" stopColor="#367af2" />
          <stop offset=".87" stopColor="#001a8f" />
        </radialGradient>
        <radialGradient
          id={gradientIdH}
          cx="-657.62"
          cy="854.65"
          r="13.89"
          fx="-657.62"
          fy="854.65"
          gradientTransform="matrix(0 11.2 12.76 0 -10796.09 7734.8)"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset=".59" stopColor="#2763e5" stopOpacity="0" />
          <stop offset=".97" stopColor="#58aafe" />
        </radialGradient>
        <linearGradient
          id={gradientIdB}
          x1="69.43"
          x2="388.45"
          y1="238.11"
          y2="238.11"
          gradientTransform="matrix(1 0 0 -1 0 502)"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#66c0ff" />
          <stop offset=".26" stopColor="#0094f0" />
        </linearGradient>
        <linearGradient
          id={gradientIdE}
          x1="69.48"
          x2="485.94"
          y1="380.04"
          y2="373.16"
          gradientTransform="matrix(1 0 0 -1 0 502)"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#9deaff" />
          <stop offset=".2" stopColor="#3bd5ff" />
        </linearGradient>
      </defs>
      <path
        d="m69.43 376.25 194.4-237.36L486 293.13v158.26c0 26.85-21.76 48.61-48.6 48.61H152.74c-46.01 0-83.31-37.31-83.31-83.33v-40.42Z"
        fill={`url(#${gradientIdA})`}
      />
      <path
        d="M69.43 208.87c0-34.52 27.98-62.5 62.49-62.5h283.11L486 111.11v173.61c0 26.85-21.76 48.61-48.6 48.61H152.74c-46.01 0-83.31 37.31-83.31 83.33v-207.8Z"
        fill={`url(#${gradientIdB})`}
      />
      <path
        d="M69.43 208.87c0-34.52 27.98-62.5 62.49-62.5h283.11L486 111.11v173.61c0 26.85-21.76 48.61-48.6 48.61H152.74c-46.01 0-83.31 37.31-83.31 83.33v-207.8Z"
        fill={`url(#${gradientIdC})`}
        fillOpacity=".6"
      />
      <path
        d="M69.43 208.87c0-34.52 27.98-62.5 62.49-62.5h283.11L486 111.11v173.61c0 26.85-21.76 48.61-48.6 48.61H152.74c-46.01 0-83.31 37.31-83.31 83.33v-207.8Z"
        fill={`url(#${gradientIdD})`}
        fillOpacity=".1"
      />
      <path
        d="M69.43 83.33C69.43 37.31 106.73 0 152.74 0H437.4C464.24 0 486 21.76 486 48.61v69.44c0 26.85-21.76 48.61-48.6 48.61H152.74c-46.01 0-83.31 37.31-83.31 83.33V83.33Z"
        fill={`url(#${gradientIdE})`}
      />
      <path
        d="M69.43 83.33C69.43 37.31 106.73 0 152.74 0H437.4C464.24 0 486 21.76 486 48.61v69.44c0 26.85-21.76 48.61-48.6 48.61H152.74c-46.01 0-83.31 37.31-83.31 83.33V83.33Z"
        fill={`url(#${gradientIdF})`}
        fillOpacity=".8"
      />
      <rect
        width="222.17"
        height="222.22"
        y="236.11"
        rx="45.13"
        ry="45.13"
        fill={`url(#${gradientIdG})`}
      />
      <rect
        width="222.17"
        height="222.22"
        y="236.11"
        rx="45.13"
        ry="45.13"
        fill={`url(#${gradientIdH})`}
        fillOpacity=".65"
      />
      <path
        d="M187.26 283.73 159.92 410.7l-32.69.02-16.14-76.19-16.9 76.19h-33L34.91 283.75h26.95l16.21 83.79 16.11-83.79h33.04l16.87 83.79 15.82-83.79 27.34-.02Z"
        fill="#fff"
      />
    </svg>
  );
}
