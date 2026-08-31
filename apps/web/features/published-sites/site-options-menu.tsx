"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import {
  FileCodeIcon,
  LanguageCircleIcon,
  MoreHorizontalIcon,
  Sun01Icon,
  Tick01Icon,
} from "@hugeicons/core-free-icons";
import { LibraryFileIcon } from "@/features/libraries/library-file-icon";
import type { Locale } from "@baseblocks/i18n";
import { Button } from "@baseblocks/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@baseblocks/ui/dropdown-menu";
import type { OpenEditorExportFormat } from "@openeditor/export/export";
import { useLocale, useTranslations } from "next-intl";
import { useTheme } from "next-themes";

type ExportOption = {
  contentType: string;
  filename: string;
  format: OpenEditorExportFormat;
  labelKey:
    | "exportHtml"
    | "exportJson"
    | "exportMarkdown"
    | "exportText"
    | "exportWord";
};

const exportOptions = [
  {
    format: "docx",
    labelKey: "exportWord",
    filename: "export.docx",
    contentType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  },
  {
    format: "markdown",
    labelKey: "exportMarkdown",
    filename: "export.md",
    contentType: "text/markdown",
  },
  {
    format: "html",
    labelKey: "exportHtml",
    filename: "export.html",
    contentType: "text/html",
  },
  {
    format: "text",
    labelKey: "exportText",
    filename: "export.txt",
    contentType: "text/plain",
  },
  {
    format: "json",
    labelKey: "exportJson",
    filename: "export.json",
    contentType: "application/json",
  },
] as const satisfies readonly ExportOption[];

function publicLocalePath(pathname: string, locale: Locale) {
  const localePattern = /^\/(en|fr)(?=\/|$)/;
  const unprefixed = pathname.replace(localePattern, "") || "/";
  return locale === "en" ? unprefixed : `/fr${unprefixed}`;
}

function ExportFormatIcon({ option }: { option: ExportOption }) {
  if (option.format === "html" || option.format === "json") {
    return <HugeiconsIcon aria-hidden className="size-4" icon={FileCodeIcon} />;
  }

  return (
    <LibraryFileIcon
      className="size-4"
      contentType={option.contentType}
      filename={option.filename}
    />
  );
}

export function PublicSiteOptionsMenu({ pageId }: { pageId?: string }) {
  const locale = useLocale() as Locale;
  const common = useTranslations("common");
  const language = useTranslations("language");
  const { setTheme, theme } = useTheme();

  const selectLocale = (selection: Locale | "browser") => {
    if (selection === "browser") {
      // biome-ignore lint/suspicious/noDocumentCookie: NEXT_LOCALE is also read by the edge proxy.
      document.cookie = "NEXT_LOCALE=; Path=/; Max-Age=0; SameSite=Lax";
    } else {
      // biome-ignore lint/suspicious/noDocumentCookie: NEXT_LOCALE is also read by the edge proxy.
      document.cookie = `NEXT_LOCALE=${selection}; Path=/; Max-Age=31536000; SameSite=Lax`;
    }
    window.location.assign(
      selection === "browser"
        ? publicLocalePath(window.location.pathname, "en")
        : publicLocalePath(window.location.pathname, selection),
    );
  };

  const exportPage = (format: OpenEditorExportFormat) => {
    if (!pageId) return;
    window.location.assign(`/api/pages/${pageId}/export?format=${format}`);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label={common("moreOptions")}
          className="text-muted-foreground hover:text-foreground"
          size="icon"
          type="button"
          variant="ghost"
        >
          <HugeiconsIcon
            aria-hidden
            className="size-[1.2rem]"
            icon={MoreHorizontalIcon}
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {pageId ? (
          <>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <HugeiconsIcon aria-hidden icon={FileCodeIcon} />
                <span>{common("exportMenu")}</span>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-52">
                {exportOptions.map((option) => (
                  <DropdownMenuItem
                    key={option.format}
                    onSelect={() => exportPage(option.format)}
                  >
                    <ExportFormatIcon option={option} />
                    <span className="flex-1">{common(option.labelKey)}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
          </>
        ) : null}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <HugeiconsIcon aria-hidden icon={LanguageCircleIcon} />
            <span>{language("menuLabel")}</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-52">
            <DropdownMenuItem onSelect={() => selectLocale("browser")}>
              <span className="flex-1">{language("browserDefault")}</span>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => selectLocale("en")}>
              <span className="flex-1">{language("english")}</span>
              {locale === "en" ? (
                <HugeiconsIcon
                  aria-hidden
                  icon={Tick01Icon}
                  className="size-4"
                />
              ) : null}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => selectLocale("fr")}>
              <span className="flex-1">{language("french")}</span>
              {locale === "fr" ? (
                <HugeiconsIcon
                  aria-hidden
                  icon={Tick01Icon}
                  className="size-4"
                />
              ) : null}
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <HugeiconsIcon aria-hidden icon={Sun01Icon} />
            <span>{common("themeMenu")}</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-40">
            {(
              [
                ["light", "themeLight"],
                ["dark", "themeDark"],
                ["system", "themeSystem"],
              ] as const
            ).map(([value, labelKey]) => (
              <DropdownMenuItem key={value} onSelect={() => setTheme(value)}>
                <span className="flex-1">{common(labelKey)}</span>
                {theme === value ? (
                  <HugeiconsIcon
                    aria-hidden
                    icon={Tick01Icon}
                    className="size-4"
                  />
                ) : null}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
