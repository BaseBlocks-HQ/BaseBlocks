"use client";

import { cn } from "@/lib/utils";
import { Button } from "@baseblocks/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@baseblocks/ui/dropdown-menu";
import { ChevronsUpDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import type { SVGProps } from "react";

function ThemeLightIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M8.21 2.109a.256.256 0 0 0-.42 0L6.534 3.893a.256.256 0 0 1-.316.085l-1.982-.917a.256.256 0 0 0-.362.21l-.196 2.174a.256.256 0 0 1-.232.232l-2.175.196a.256.256 0 0 0-.209.362l.917 1.982a.256.256 0 0 1-.085.316L.11 9.791a.256.256 0 0 0 0 .418L1.23 11H3.1a5 5 0 1 1 9.8 0h1.869l1.123-.79a.256.256 0 0 0 0-.42l-1.785-1.257a.256.256 0 0 1-.085-.316l.917-1.982a.256.256 0 0 0-.21-.362l-2.174-.196a.256.256 0 0 1-.232-.232l-.196-2.175a.256.256 0 0 0-.362-.209l-1.982.917a.256.256 0 0 1-.316-.085z" />
      <path d="M4 10q.001.519.126 1h7.748A4 4 0 1 0 4 10M.75 12a.75.75 0 0 0 0 1.5h14.5a.75.75 0 0 0 0-1.5z" />
    </svg>
  );
}

function ThemeDarkIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M10.794 3.647a.217.217 0 0 1 .412 0l.387 1.162c.173.518.58.923 1.097 1.096l1.162.388a.217.217 0 0 1 0 .412l-1.162.386a1.73 1.73 0 0 0-1.097 1.097l-.387 1.162a.217.217 0 0 1-.412 0l-.387-1.162A1.74 1.74 0 0 0 9.31 7.092l-1.162-.386a.217.217 0 0 1 0-.412l1.162-.388a1.73 1.73 0 0 0 1.097-1.096zM13.863.598a.144.144 0 0 1 .221-.071.14.14 0 0 1 .053.07l.258.775c.115.345.386.616.732.731l.774.258a.145.145 0 0 1 0 .274l-.774.259a1.16 1.16 0 0 0-.732.732l-.258.773a.145.145 0 0 1-.274 0l-.258-.773a1.16 1.16 0 0 0-.732-.732l-.774-.259a.145.145 0 0 1 0-.273l.774-.259c.346-.115.617-.386.732-.732z" />
      <path d="M6.25 1.742a.67.67 0 0 1 .07.75 6.3 6.3 0 0 0-.768 3.028c0 2.746 1.746 5.084 4.193 5.979H1.774A7.2 7.2 0 0 1 1 8.245c0-3.013 1.85-5.598 4.484-6.694a.66.66 0 0 1 .766.19M.75 12.499a.75.75 0 0 0 0 1.5h14.5a.75.75 0 0 0 0-1.5z" />
    </svg>
  );
}

export function ModeToggle({
  className,
  variant = "icon",
}: {
  className?: string;
  variant?: "icon" | "row";
}) {
  const { setTheme, theme, resolvedTheme } = useTheme();
  const t = useTranslations("common");

  const themeSummary =
    theme === "system"
      ? t("themeSystem")
      : resolvedTheme === "dark"
        ? t("themeDark")
        : t("themeLight");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {variant === "row" ? (
          <Button
            className={cn(
              "flex h-10 w-full items-center gap-2 rounded-[1.15rem] border border-transparent px-3 text-muted-foreground hover:bg-accent/55 hover:text-foreground sm:rounded-[1.25rem]",
              className,
            )}
            type="button"
            variant="ghost"
          >
            <span className="relative h-4 w-4 shrink-0">
              <ThemeLightIcon className="absolute h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <ThemeDarkIcon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            </span>
            <span className="min-w-0 flex-1 truncate text-left text-sm text-foreground">
              {themeSummary}
            </span>
            <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
          </Button>
        ) : (
          <Button
            className={cn(
              "relative text-muted-foreground hover:text-foreground",
              className,
            )}
            size="icon"
            variant="ghost"
          >
            <ThemeLightIcon className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <ThemeDarkIcon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme("light")}>
          {t("themeLight")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          {t("themeDark")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>
          {t("themeSystem")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
