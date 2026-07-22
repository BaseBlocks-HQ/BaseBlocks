import { routing } from "@/i18n/routing";
import { docs } from "collections/server";
import { defineI18n } from "fumadocs-core/i18n";
import { loader } from "fumadocs-core/source";
import {
  IconBadgeSparkle,
  IconCodeEditor,
  IconColorPalette,
  IconFeather,
  IconFile,
  IconGauge,
  IconGear,
  IconMonitor,
  IconNut,
  IconRocket,
  IconSignal,
  IconSquareGrid,
  IconSquarePointer,
  IconTabs,
  IconToggle,
  IconUsers,
  IconWindow2,
} from "nucleo-glass";
import { createElement } from "react";

const docsI18n = defineI18n({
  languages: [...routing.locales],
  defaultLanguage: routing.defaultLocale,
  hideLocale: "default-locale",
});

const docsIconMap = {
  BadgeSparkle: IconBadgeSparkle,
  BookOpen: IconBadgeSparkle,
  Building2: IconMonitor,
  CodeEditor: IconCodeEditor,
  Feather: IconFeather,
  FileText: IconFile,
  Gauge: IconGauge,
  Globe: IconRocket,
  Monitor: IconMonitor,
  Nut: IconNut,
  Palette: IconColorPalette,
  Signal: IconSignal,
  SquareGrid: IconSquareGrid,
  SquarePointer: IconSquarePointer,
  Settings: IconGear,
  Tabs: IconTabs,
  Toggle: IconToggle,
  Users: IconUsers,
  Window2: IconWindow2,
  Zap: IconRocket,
} as const;

function resolveContentIcon(icon: string | undefined) {
  if (!icon) return;
  if (icon in docsIconMap) {
    return createElement(docsIconMap[icon as keyof typeof docsIconMap]);
  }
}

export const source = loader({
  baseUrl: "/docs",
  source: docs.toFumadocsSource(),
  i18n: docsI18n,
  icon: resolveContentIcon,
});
