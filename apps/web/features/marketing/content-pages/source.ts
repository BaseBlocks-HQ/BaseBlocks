import { routing } from "@/i18n/routing";
import { docs } from "collections/server";
import { defineI18n } from "fumadocs-core/i18n";
import { loader } from "fumadocs-core/source";
import {
  Blocks,
  BookOpen,
  Columns3,
  Cookie,
  Eye,
  Feather,
  FileText,
  Gauge,
  GitCompareArrows,
  Globe,
  LayoutGrid,
  Monitor,
  Network,
  Palette,
  PanelsTopLeft,
  PenLine,
  Rocket,
  Scale,
  Send,
  Settings,
  SlidersHorizontal,
  UsersRound,
} from "lucide-react";
import { createElement } from "react";

const docsI18n = defineI18n({
  languages: [...routing.locales],
  defaultLanguage: routing.defaultLocale,
  hideLocale: "default-locale",
});

const docsIconMap = {
  Blocks,
  BookOpen,
  Columns3,
  Cookie,
  Eye,
  Feather,
  FileText,
  Gauge,
  GitCompareArrows,
  Globe,
  Monitor,
  Network,
  Palette,
  PanelsTopLeft,
  PenLine,
  Rocket,
  Scale,
  Send,
  Settings,
  SlidersHorizontal,
  SquareGrid: LayoutGrid,
  UsersRound,
} as const;

function resolveContentIcon(icon: string | undefined) {
  if (!icon) return;
  if (icon in docsIconMap) {
    return createElement(docsIconMap[icon as keyof typeof docsIconMap], {
      strokeWidth: 1.65,
    });
  }
}

export const source = loader({
  baseUrl: "/docs",
  source: docs.toFumadocsSource(),
  i18n: docsI18n,
  icon: resolveContentIcon,
});
