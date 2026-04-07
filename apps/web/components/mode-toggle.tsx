"use client";

import { cn } from "@/lib/utils";
import { Button } from "@baseblocks/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@baseblocks/ui/dropdown-menu";
import { ChevronsUpDown, Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";

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
              <Sun className="absolute h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            </span>
            <span className="min-w-0 flex-1 truncate text-left text-sm text-foreground">
              {themeSummary}
            </span>
            <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
          </Button>
        ) : (
          <Button
            className={cn("relative", className)}
            size="icon"
            variant="ghost"
          >
            <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
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
