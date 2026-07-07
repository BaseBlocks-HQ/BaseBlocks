import type { PageExportFormat, PageExportMode } from "./page-export";

export function getPageExportHref(args: {
  pageId: string;
  format: PageExportFormat;
  mode: PageExportMode;
}) {
  const searchParams = new URLSearchParams({
    format: args.format,
    mode: args.mode,
  });

  return `/api/pages/${args.pageId}/export?${searchParams.toString()}`;
}

export function downloadPageExport(args: {
  pageId: string;
  format: PageExportFormat;
  mode: PageExportMode;
}) {
  const link = document.createElement("a");
  link.href = getPageExportHref(args);
  link.rel = "noopener noreferrer";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
